import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome", headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(6000);

const range = await page.evaluate(() => {
  const st = window.__viture.ScrollTrigger.getAll().find(
    (s) => s.vars.scrub && s.trigger.closest("#s06"),
  );
  return { start: st.start, end: st.end };
});
console.log("range", range);

const state = () =>
  page.evaluate(() => {
    const st = window.__viture.ScrollTrigger.getAll().find(
      (s) => s.vars.scrub && s.trigger.closest("#s06"),
    );
    const stage = document.querySelector("#s06 .stage--d");
    const pick = (sel) => {
      const n = stage.querySelector(sel);
      const cs = getComputedStyle(n);
      return `vis=${cs.visibility} tf=${cs.transform} h=${cs.height}`;
    };
    return {
      scrollY: Math.round(window.scrollY),
      stProg: st.progress.toFixed(3),
      tlProg: st.animation.progress().toFixed(3),
      tlPaused: st.animation.paused(),
      stEnabled: !st.disabled,
      card: pick(".s06-card"),
      ca: pick(".s06-ca"),
      cb: pick(".s06-cb"),
    };
  });

const goto = async (target, steps = 60) => {
  const cur = await page.evaluate(() => window.scrollY);
  for (let i = 1; i <= steps; i++) {
    const y = cur + ((target - cur) * i) / steps;
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(2000);
};

const p = (x) => range.start + x * (range.end - range.start);
await goto(p(0.7));
console.log("fwd 0.70", JSON.stringify(await state()));
await goto(p(1.0) + 400);
console.log("past end", JSON.stringify(await state()));
await goto(p(0.7));
console.log("back 0.70", JSON.stringify(await state()));
await page.screenshot({ path: "qa/_headed3-back-070.png" });
await browser.close();
