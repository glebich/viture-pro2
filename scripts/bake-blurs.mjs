// Bake blurred-SVG assets to raster webp.
//
// Many harvest SVGs carry giant feGaussianBlur filters (stdDeviation 77-150
// over 8000px-wide canvases). Chromium caches the rasterization, but
// Safari/WebKit re-rasterizes the SVG filter graph during scroll and tanks
// to ~20fps. Since none of these blurs ever animate, we pre-render each SVG
// once (headless chromium — guarantees filter-spec fidelity) and encode a
// `<name>.baked.webp` sibling via sharp. Sections then reference the baked
// asset with no runtime filter at all.
//
// The rasters are capped at 4096px on the long edge; the sources are pure
// blur fields, so CSS upscaling back to their 8000px+ layout size is
// visually lossless (validated with before/after chromium snaps).
//
// Usage: node scripts/bake-blurs.mjs [path-substring-filter]
//   e.g. `node scripts/bake-blurs.mjs Screen-23` re-bakes only the s23 pair.
import { chromium } from "playwright";
import sharp from "sharp";
import { readFile, writeFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

// blurred SVGs referenced by live sections (s03's assets are excluded —
// that section is being reworked separately)
const SVGS = [
  "1920_Screen-05-01/imgEllipse1329130913.svg",
  "1920_Screen-06-01/img1920Screen0601.svg",
  "1920_Screen-10-01a/imgEllipse1329130914.svg",
  "1920_Screen-10-01b/imgEllipse1329130915.svg",
  "1920_Screen-11-01/imgEllipse1329130912.svg",
  "1920_Screen-12-01/imgEllipse1329130913.svg",
  "1920_Screen-15-01/imgEllipse1329130924.svg",
  "1920_Screen-16-01/imgEllipse1329130924.svg",
  "1920_Screen-21-01/img1920Screen2101.svg",
  "1920_Screen-22-01/imgEllipse1329130912.svg",
  "1920_Screen-23-01/img1920Screen2301.svg",
  "375_Screen-05-01/imgEllipse1329130913.svg",
  "375_Screen-06-01/img375Screen0601.svg",
  "375_Screen-10-01a/imgEllipse1329130914.svg",
  "375_Screen-10-01b/imgEllipse1329130915.svg",
  "375_Screen-11-01a/imgEllipse1329130912.svg",
  "375_Screen-11-01b/imgEllipse1329130912.svg",
  "375_Screen-15-01/imgEllipse1329130924.svg",
  "375_Screen-16-01/imgEllipse1329130924.svg",
  "375_Screen-21-01/img375Screen2101.svg",
  "375_Screen-22-01/imgEllipse1329130912.svg",
  "375_Screen-23-01/img375Screen2301.svg",
];

const MAX_DIM = 4096;
const root = resolve(import.meta.dirname, "../public/assets");

// Per-asset near-lossless quality override (default 60). The s23 footer
// gradient spans ~500px of near-black at ~1 level per 4px — at quality 60
// libwebp's near-lossless pixel preprocessing merges those 1-level steps
// into visible 2-3 level bands (client review round 3). 100 disables the
// preprocessing entirely (true lossless), keeping the steps at the 8-bit
// floor where the global film-grain overlay (base.css body::after) can
// dither them away.
const QUALITY = { default: 60 };
for (const rel of ["1920_Screen-23-01/img1920Screen2301.svg",
                   "375_Screen-23-01/img375Screen2301.svg"])
  QUALITY[rel] = 100;

const filter = process.argv[2];

// Source patches applied before rasterizing. The s23 frame rect ends exactly
// at the section's bottom edge; at reduced raster resolution the antialiased
// rect edge + transparent rows below it get bilinear-smeared into the last
// visible row (a dark seam). Extending the flat rect downward (into a region
// that is never visible) gives the sampler opaque neighbors instead.
const PATCHES = {
  "1920_Screen-23-01/img1920Screen2301.svg": (s) =>
    s.replace(
      'y="844.744" width="1920" height="1080"',
      'y="844.744" width="1920" height="1380"'
    ),
  "375_Screen-23-01/img375Screen2301.svg": (s) =>
    s.replace(
      'y="673.522" width="375" height="812"',
      'y="673.522" width="375" height="1112"'
    ),
};

const browser = await chromium.launch();
for (const rel of SVGS) {
  if (filter && !rel.includes(filter)) continue;
  const abs = resolve(root, rel);
  let src = await readFile(abs, "utf8");
  let renderPath = abs;
  let tmp = null;
  if (PATCHES[rel]) {
    const patched = PATCHES[rel](src);
    if (patched === src) throw new Error(`patch did not apply: ${rel}`);
    src = patched;
    tmp = join(tmpdir(), `bake-${rel.replace(/\//g, "_")}`);
    await writeFile(tmp, patched);
    renderPath = tmp;
  }
  const vb = src.match(/viewBox="([\d.\s-]+)"/);
  if (!vb) {
    console.warn(`skip (no viewBox): ${rel}`);
    continue;
  }
  const [, , vw, vh] = vb[1].trim().split(/\s+/).map(Number);
  const scale = Math.min(1, MAX_DIM / Math.max(vw, vh));
  const w = Math.max(2, Math.round(vw * scale));
  const h = Math.max(2, Math.round(vh * scale));

  // Navigating chromium straight to the SVG renders it as a document:
  // width/height are 100%, so it fills the viewport at exactly w×h, and
  // preserveAspectRatio="none" stretches identically to its <img> usage.
  const page = await browser.newPage({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
  });
  await page.goto(pathToFileURL(renderPath).href);
  const png = await page.screenshot({ omitBackground: true });
  await page.close();
  if (tmp) await rm(tmp, { force: true });

  const out = abs.replace(/\.svg$/, ".baked.webp");
  // near-lossless: plain lossy webp posterizes these ultra-shallow blur
  // gradients into visible bands
  const buf = await sharp(png)
    .webp({ nearLossless: true, quality: QUALITY[rel] ?? QUALITY.default })
    .toBuffer();
  // write the encoded buffer directly — `sharp(buf).toFile(out)` would
  // DECODE it and re-encode at sharp's default lossy quality 80, silently
  // discarding the near-lossless pass (this was the source of the baked
  // gradients' banding in client review round 3)
  await writeFile(out, buf);
  console.log(`baked ${rel} -> ${w}x${h} (${(buf.length / 1024).toFixed(0)}kB)`);
}
await browser.close();
