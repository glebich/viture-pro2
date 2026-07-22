// s01 glasses-registration probe: timed captures + live geometry readout
// usage: node s01probe.mjs <webkit|chromium> <W> <H> <tag>
import { chromium, webkit } from "playwright";
import fs from "node:fs";

const [engineName, W, H, tag] = process.argv.slice(2);
const outdir = "qa/_s01probe/";
fs.mkdirSync(outdir, { recursive: true });
const browser = await (engineName === "webkit" ? webkit : chromium).launch();
const page = await browser.newPage({
  viewport: { width: +W, height: +H },
  deviceScaleFactor: 1,
});
await page.goto("http://localhost:5173/?only=s01", { waitUntil: "commit" });
// wait for the section to exist, then sample on a fixed schedule keyed to
// the moment the photo tween actually starts moving (scale < 1.06)
await page.waitForSelector(".s01-photo", {
  timeout: 15000,
  state: "attached",
});
const t0 = await page.evaluate(
  () =>
    new Promise((res) => {
      const el =
        window.innerWidth <= 640
          ? document.querySelector(".stage--m .s01-photo")
          : document.querySelector(".s01-photo");
      const tick = () => {
        const m = getComputedStyle(el).transform;
        const sc = m && m !== "none" ? parseFloat(m.slice(7)) : 1;
        if (sc < 1.0599 && sc > 1.0) res(performance.now());
        else requestAnimationFrame(tick);
      };
      tick();
    })
);
const geom = () =>
  page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const photo = q(".stage--d .s01-photo") || q(".s01-photo");
    const svg = q(".stage--d .s01-glasses") || q(".s01-glasses");
    const stage = svg.closest(".stage");
    const m = getComputedStyle(photo).transform;
    const pw = photo.closest(".stage");
    const wrap = q(".s01-gscale");
    return {
      photoTransform: m,
      photoStageRect: pw.getBoundingClientRect().toJSON(),
      svgRect: svg.getBoundingClientRect().toJSON(),
      stageRect: stage.getBoundingClientRect().toJSON(),
      wrapTransform: wrap ? getComputedStyle(wrap).transform : null,
      s: getComputedStyle(document.documentElement).getPropertyValue("--s"),
    };
  });
const shots = [
  ["middraw", 900], // outer stroke mostly drawn, photo still overscaled
  ["latedraw", 1400], // details drawing
  ["rest", 3600], // everything settled, line art at full, pre-melt? (melt at 1.8+0.2=2.0s..2.7s) -> after melt
];
// NOTE: melt (glasses fade) starts at tl 1.8 => ~2.0s real; so capture
// "rest" registration BEFORE melt: use 1750ms. Keep 3600 as "settled" too.
shots[2] = ["prem", 1750];
shots.push(["settled", 3600]);
for (const [name, at] of shots) {
  const now = await page.evaluate(() => performance.now());
  const wait = t0 + at - now;
  if (wait > 0) await page.waitForTimeout(wait);
  const g = await geom();
  console.log(`[${engineName} ${W}x${H} ${name}]`, JSON.stringify(g));
  await page.screenshot({ path: `${outdir}${tag}-${engineName}-${name}.png` });
}
await browser.close();
