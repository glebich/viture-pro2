import { webkit } from "playwright";

const browser = await webkit.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(6000);
const range = await page.evaluate(() => {
  const st = window.__viture.ScrollTrigger.getAll().find(
    (s) => s.vars.scrub && s.trigger.closest("#s06"),
  );
  return { start: st.start, end: st.end };
});
const goto = async (target, steps = 50) => {
  const cur = await page.evaluate(() => window.scrollY);
  for (let i = 1; i <= steps; i++) {
    const y = cur + ((target - cur) * i) / steps;
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(1500);
};
await goto(range.start + 0.1 * (range.end - range.start));
const st = await page.evaluate(() => {
  const stage = document.querySelector("#s06 .stage--d");
  const pick = (sel) => {
    const n = stage.querySelector(sel);
    return `inline-vis="${n.style.visibility}" computed=${getComputedStyle(n).visibility} op=${getComputedStyle(n).opacity}`;
  };
  return {
    wrap: pick(".s06-maskwrap"),
    tex: pick(".s06-tex"),
    photo: pick(".s06-photo"),
    ca: pick(".s06-ca"),
    cb: pick(".s06-cb"),
  };
});
console.log(JSON.stringify(st, null, 1));
await page.screenshot({ path: "qa/_wkh-010.png" });
await browser.close();
