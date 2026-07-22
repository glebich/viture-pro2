import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome", headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on("pageerror", (e) => console.log("PAGE ERR:", String(e).slice(0, 200)));

// FULL page — lenis active, all sections mounted, s06 timeline built late
await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(5000); // loader + fonts + late s06 build

const range = await page.evaluate(() => {
  const st = window.__viture.ScrollTrigger.getAll().find(
    (s) => s.vars.scrub && s.trigger.closest("#s06"),
  );
  return { start: st.start, end: st.end };
});
console.log("s06 pin range", range);

// real wheel scrolling from top to the card beat
await page.mouse.move(800, 450);
const target = range.start + 0.7 * (range.end - range.start);
let pos = 0;
while (pos < target) {
  await page.mouse.wheel(0, 400);
  pos = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(30);
  if (pos > target - 400) break;
}
// fine approach
for (let i = 0; i < 40; i++) {
  const y = await page.evaluate(() => window.scrollY);
  if (y >= target) break;
  await page.mouse.wheel(0, Math.min(120, target - y));
  await page.waitForTimeout(40);
}
await page.waitForTimeout(1500);
const st = await page.evaluate(() => {
  const s = window.__viture.ScrollTrigger.getAll().find(
    (x) => x.vars.scrub && x.trigger.closest("#s06"),
  );
  return { prog: s.progress.toFixed(3), tl: s.animation.progress().toFixed(3) };
});
console.log("at", JSON.stringify(st));
await page.screenshot({ path: "qa/_headed-070.png" });

// wheel further to end, then back up to the beat — the scrub-back path
await page.mouse.wheel(0, range.end);
await page.waitForTimeout(2000);
for (let i = 0; i < 60; i++) {
  const y = await page.evaluate(() => window.scrollY);
  if (y <= target + 60) break;
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(30);
}
await page.waitForTimeout(1500);
await page.screenshot({ path: "qa/_headed-back-070.png" });
await browser.close();
