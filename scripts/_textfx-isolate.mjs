// Text-isolation rest-state compare: capture every textfx section twice —
// live vs ?notextfx control — with the fluid canvas and all videos hidden,
// then report per-pixel deltas at perceptual thresholds.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import sharp from "sharp";

mkdirSync("qa/textfx/isolate", { recursive: true });
const BASE = "http://localhost:5173";
const SHOTS = [
  ["s02", "", 4200, "d"], ["s05", "", 4200, "d"], ["s20", "", 4200, "d"],
  ["s21", "", 4200, "d"], ["s23", "", 5200, "d"], ["s25", "", 4200, "d"],
  ["s26", "", 4200, "d"],
  ["s16b", "&progress=0", 3200, "d"], ["s16b", "&progress=1", 3200, "d"],
  ["s14", "&progress=1", 3200, "d"],
  ["s22", "&progress=0", 3200, "d"], ["s22", "&progress=0.25", 3200, "d"],
  ["s22", "&progress=0.5", 3200, "d"], ["s22", "&progress=0.75", 3200, "d"],
  ["s22", "&progress=1", 3200, "d"],
  ["s24", "&progress=0", 3200, "d"], ["s24", "&progress=0.5", 3200, "d"],
  ["s24", "&progress=1", 3200, "d"],
  ["s02", "", 4200, "m"], ["s21", "", 4200, "m"], ["s22", "", 4200, "m"],
  ["s24", "", 4200, "m"], ["s23", "", 5200, "m"], ["s14", "&progress=1", 3200, "m"],
  ["s16b", "&progress=1", 3200, "m"],
];

const browser = await chromium.launch();
const cap = async (id, query, wait, bp, variant, out) => {
  const page = await browser.newPage({
    viewport: bp === "m" ? { width: 375, height: 812 } : { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  await page.goto(`${BASE}/?only=${id}${query}${variant}`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "#fluid-bg, video { visibility: hidden !important; }" });
  await page.waitForTimeout(wait);
  await page.screenshot({ path: out });
  if (errors.length) console.log(`  !! ${out}: ${errors.join(" | ")}`);
  await page.close();
};

const rows = [];
for (const [id, query, wait, bp] of SHOTS) {
  const p = query ? query.replace("&progress=", "-p") : "";
  const name = `${id}${p}-${bp}`;
  const a = `qa/textfx/isolate/${name}-ctrl.png`;
  const b = `qa/textfx/isolate/${name}-live.png`;
  await cap(id, query, wait, bp, "&notextfx", a);
  await cap(id, query, wait, bp, "", b);
  const A = await sharp(a).raw().toBuffer({ resolveWithObject: true });
  const B = await sharp(b).raw().toBuffer({ resolveWithObject: true });
  const n = A.info.width * A.info.height;
  const ch = A.info.channels;
  let over2 = 0, over24 = 0, over48 = 0, max = 0;
  for (let i = 0; i < n; i++) {
    let d = 0;
    for (let c = 0; c < 3; c++)
      d = Math.max(d, Math.abs(A.data[i * ch + c] - B.data[i * ch + c]));
    if (d > 2) over2++;
    if (d > 24) over24++;
    if (d > 48) over48++;
    if (d > max) max = d;
  }
  rows.push({ name, max, over2, over24, over48, pct24: ((over24 / n) * 100).toFixed(4) });
  console.log(`${name}  max=${max}  >2:${over2}  >24:${over24}  >48:${over48}`);
}
console.log(JSON.stringify(rows, null, 1));
await browser.close();
