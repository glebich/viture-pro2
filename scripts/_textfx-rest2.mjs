// addendum mobile/rest baselines for the textfx pass
import { chromium, webkit } from "playwright";
import { mkdirSync } from "node:fs";
const outdir = process.argv[2] ?? "qa/textfx/before";
const engine = process.argv[3] ?? "chromium";
mkdirSync(outdir, { recursive: true });
const BASE = "http://localhost:5173";
const SHOTS = [
  ["s05", "", 4200, "m"],
  ["s20", "", 4200, "m"],
  ["s22", "", 4200, "m"],
  ["s23", "", 5200, "m"],
  ["s25", "", 4200, "m"],
  ["s14", "&progress=1", 3000, "m"],
  ["s16b", "&progress=0", 3000, "m"],
  ["s16b", "&progress=1", 3000, "m"],
];
const browser = await (engine === "webkit" ? webkit : chromium).launch();
for (const [id, query, wait, bp] of SHOTS) {
  const page = await browser.newPage({
    viewport: bp === "m" ? { width: 375, height: 812 } : { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  await page.goto(`${BASE}/?only=${id}${query}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(wait);
  await page.evaluate(() => {
    document.querySelectorAll("video").forEach((v) => { v.pause(); try { v.currentTime = 0; } catch {} });
  });
  await page.waitForTimeout(400);
  const p = query ? query.replace("&progress=", "-p") : "";
  const name = `${id}${p}-${bp}.png`;
  await page.screenshot({ path: `${outdir}/${name}` });
  console.log(`${name}${errors.length ? "  ERRORS: " + errors.join(" | ") : ""}`);
  await page.close();
}
await browser.close();
