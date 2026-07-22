import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome", headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(6000); // loader auto-glide + fonts + late s06 build

const range = await page.evaluate(() => {
  const st = window.__viture.ScrollTrigger.getAll().find(
    (s) => s.vars.scrub && s.trigger.closest("#s06"),
  );
  return { start: st.start, end: st.end };
});
console.log("range", range);

const goto = async (target, steps = 60) => {
  const cur = await page.evaluate(() => window.scrollY);
  for (let i = 1; i <= steps; i++) {
    const y = cur + ((target - cur) * i) / steps;
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(1500);
};

const p = (x) => range.start + x * (range.end - range.start);
await goto(p(0.7));
const st1 = await page.evaluate(() => {
  const s = window.__viture.ScrollTrigger.getAll().find(
    (x) => x.vars.scrub && x.trigger.closest("#s06"),
  );
  return { prog: s.progress.toFixed(3) };
});
console.log("at", JSON.stringify(st1));
await page.screenshot({ path: "qa/_headed2-070.png" });
await goto(p(1.0) + 400);
await goto(p(0.7));
await page.screenshot({ path: "qa/_headed2-back-070.png" });
await goto(p(0.86));
await page.screenshot({ path: "qa/_headed2-086.png" });
await browser.close();
