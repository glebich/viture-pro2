import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({
  viewport: { width: 1728, height: 1010 },
  deviceScaleFactor: 2,
});
page.on("pageerror", (e) => console.log("PAGE ERR:", String(e).slice(0, 200)));

await page.goto("http://localhost:5173/?only=s06", { waitUntil: "networkidle" });
await page.waitForTimeout(3500);

const range = await page.evaluate(() => {
  const st = window.__viture.ScrollTrigger.getAll().find(
    (s) => s.vars.scrub && s.trigger.closest("#s06"),
  );
  return { start: st.start, end: st.end };
});

const goto = async (p, steps = 25) => {
  const target = range.start + p * (range.end - range.start);
  const cur = await page.evaluate(() => window.scrollY);
  for (let i = 1; i <= steps; i++) {
    const y = cur + ((target - cur) * i) / steps;
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(1000);
};

await goto(0.7);
await page.screenshot({ path: "qa/_ret-fwd-070.png" });

// jump-enter from the bottom (one render tick at p=1), then scrub back
await page.evaluate((y) => window.scrollTo(0, y), range.end + 200);
await page.waitForTimeout(800);
await goto(0.7);
await page.screenshot({ path: "qa/_ret-jumpback-070.png" });
await goto(0.65);
await page.screenshot({ path: "qa/_ret-jumpback-065.png" });
await browser.close();
