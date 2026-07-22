// textfx QA — rest-state captures of the sections owned by the ambient
// text-reveal pass (?only harness). Entrance timelines are allowed to play
// out (extra wait), progress-swept sections are frozen at their plateaus.
// Usage: node scripts/_textfx-rest.mjs <outdir> [chromium|webkit]
import { chromium, webkit } from "playwright";
import { mkdirSync } from "node:fs";

const outdir = process.argv[2] ?? "qa/textfx/before";
const engine = process.argv[3] ?? "chromium";
mkdirSync(outdir, { recursive: true });
const BASE = "http://localhost:5173";

// [id, query, wait_ms, breakpoint]
const SHOTS = [
  ["s02", "", 4200, "d"],
  ["s05", "", 4200, "d"],
  ["s20", "", 4200, "d"],
  ["s21", "", 4200, "d"],
  ["s23", "", 5200, "d"], // bloom is 2.4s + 0.7 offset
  ["s25", "", 4200, "d"],
  ["s26", "", 4200, "d"],
  ["s16b", "&progress=0", 3000, "d"],
  ["s16b", "&progress=1", 3000, "d"],
  ["s14", "&progress=1", 3000, "d"],
  ["s22", "&progress=0", 3000, "d"],
  ["s22", "&progress=0.25", 3000, "d"],
  ["s22", "&progress=0.5", 3000, "d"],
  ["s22", "&progress=0.75", 3000, "d"],
  ["s22", "&progress=1", 3000, "d"],
  ["s24", "&progress=0", 3000, "d"],
  ["s24", "&progress=0.5", 3000, "d"],
  ["s24", "&progress=1", 3000, "d"],
  ["s02", "", 4200, "m"],
  ["s21", "", 4200, "m"],
  ["s24", "", 4200, "m"],
  ["s26", "", 4200, "m"],
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
  // freeze videos so pixel-compares don't register playback motion
  await page.evaluate(() => {
    document.querySelectorAll("video").forEach((v) => {
      v.pause();
      try { v.currentTime = 0; } catch {}
    });
  });
  await page.waitForTimeout(400);
  const p = query ? query.replace("&progress=", "-p") : "";
  const name = `${id}${p}-${bp}.png`;
  await page.screenshot({ path: `${outdir}/${name}` });
  console.log(`${name}${errors.length ? "  ERRORS: " + errors.join(" | ") : ""}`);
  await page.close();
}
await browser.close();
