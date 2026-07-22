// Timed reveal ladders: full-page load, jump-scroll each section past its
// entrance trigger, capture at ~300/700/1200/1800ms (actual elapsed logged).
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
mkdirSync("qa/textfx/ladder", { recursive: true });
const BASE = "http://localhost:5173";
const bp = process.argv[2] ?? "d";
const ids = (process.argv[3] ?? "s20,s21,s23,s25,s26").split(",");
const vp = bp === "m" ? { width: 375, height: 812 } : { width: 1920, height: 1080 };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
await page.goto(`${BASE}/?nosnap&nofx`, { waitUntil: "networkidle" });
await page.waitForTimeout(8000); // loader glide + retirement + fonts
for (const id of ids) {
  // rewind far above the section so its trigger re-arms cleanly? Entrance
  // triggers fire once per direction; ensure we approach from above the
  // trigger point. Park 2 viewports above first.
  const top = await page.evaluate((sid) => {
    const el = document.getElementById(sid);
    const r = el.getBoundingClientRect();
    return window.scrollY + r.top;
  }, id);
  const vh = vp.height;
  await page.evaluate((y) => window.scrollTo(0, Math.max(0, y)), top - vh * 3);
  await page.waitForTimeout(700);
  const target = Math.max(0, top); // full-frame; the jump crosses the 78% trigger
  const t0 = Date.now();
  await page.evaluate((y) => window.scrollTo(0, y), target);
  for (const ms of [300, 700, 1200, 1800]) {
    const wait = ms - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
    const actual = Date.now() - t0;
    await page.screenshot({ path: `qa/textfx/ladder/${id}-${bp}-${String(ms).padStart(4, "0")}.png` });
    console.log(`${id}-${bp} +${ms}ms (shot started at +${actual}ms)`);
  }
}
console.log(errors.length ? "ERRORS: " + errors.join(" | ") : "console clean");
await browser.close();
