// QA hunt: realistic wheel-scroll walkthrough with screenshots at every beat.
// Loads the page, lets the loader run (portrait + outline + counter +
// auto-advance + retirement), then wheel-scrolls the whole page down in
// realistic increments and back up, screenshotting each rest.
// Usage: node scripts/hunt-walkthrough.mjs --browser chromium|webkit \
//          --width 1920 --height 1080 --tag c1920
import { chromium, webkit } from "playwright";
import fs from "node:fs";

const arg = (name, dflt) => {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 ? process.argv[i + 1] : dflt;
};
const browserName = arg("browser", "chromium");
const W = Number(arg("width", 1920));
const H = Number(arg("height", 1080));
const tag = arg("tag", `${browserName[0]}${W}`);
const BASE = arg("base", "http://localhost:5173");
const OUT = `qa/hunt/${tag}`;
fs.mkdirSync(OUT, { recursive: true });

const browser =
  browserName === "webkit" ? await webkit.launch() : await chromium.launch();
const page = await browser.newPage({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 300)));
page.on("pageerror", (e) => errors.push(String(e).slice(0, 300)));

await page.goto(BASE, { waitUntil: "networkidle" });

// ---- loader phase: screenshot the loader beats ----
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/loader-a.png` });
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/loader-b.png` });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/loader-c.png` });
// auto-advance glide + retirement
await page.waitForTimeout(3500);
await page.screenshot({ path: `${OUT}/post-retire.png` });

const state = () =>
  page.evaluate(() => ({
    y: Math.round(window.scrollY),
    limit: Math.round(window.__viture.lenis.limit),
    s01: !!document.getElementById("s01"),
  }));
const s0 = await state();
console.log(`[${tag}] after loader: y=${s0.y} limit=${s0.limit} s01InDoc=${s0.s01}`);

// ---- wheel-scroll down in realistic notches ----
// Each beat: a burst of wheel events, then wait for lenis to settle.
const wheelBeat = async (dy, bursts = 6) => {
  for (let i = 0; i < bursts; i++) {
    await page.mouse.wheel(0, dy);
    await page.waitForTimeout(55);
  }
};
const settle = async (ms = 1400) => page.waitForTimeout(ms);

let shot = 0;
const snap = async (dir) => {
  const s = await state();
  await page.screenshot({
    path: `${OUT}/${dir}-${String(shot).padStart(3, "0")}-y${String(s.y).padStart(6, "0")}.png`,
  });
  shot++;
  return s;
};

await page.mouse.move(W / 2, H / 2);
let prevY = -1;
let stuck = 0;
for (let i = 0; i < 90; i++) {
  await wheelBeat(160, 6); // ~960px of wheel per beat before multiplier
  await settle();
  const s = await snap("dn");
  if (s.y >= s.limit - 2) break;
  if (s.y === prevY) {
    stuck++;
    if (stuck >= 3) {
      console.log(`[${tag}] STUCK at y=${s.y} (limit ${s.limit})`);
      break;
    }
  } else stuck = 0;
  prevY = s.y;
}
const bottom = await state();
console.log(`[${tag}] bottom: y=${bottom.y} limit=${bottom.limit} shots=${shot}`);

// ---- walk back up ----
shot = 0;
prevY = -1;
stuck = 0;
for (let i = 0; i < 90; i++) {
  await wheelBeat(-160, 6);
  await settle();
  const s = await snap("up");
  if (s.y <= 1) break;
  if (s.y === prevY) {
    stuck++;
    if (stuck >= 3) {
      console.log(`[${tag}] STUCK going up at y=${s.y}`);
      break;
    }
  } else stuck = 0;
  prevY = s.y;
}
const top = await state();
console.log(`[${tag}] back at top: y=${top.y}`);
console.log(`[${tag}] console errors: ${errors.length}`);
for (const e of errors.slice(0, 10)) console.log("  ERR " + e);
await browser.close();
