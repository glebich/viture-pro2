// Simulate a fling that outruns the s22 entrance: instant jump from far above
// s22 straight to the pin's first frame, screenshot BEFORE the 0.9s entrance
// could play — verifies the pin onEnter force-complete.
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(8000); // loader glide + retire

const start = await page.evaluate(() => {
  const v = window.__viture;
  const st = v.ScrollTrigger.getAll().find((s) => {
    const t = s.trigger;
    return t instanceof Element && t.id === "s22" && s.vars.pin;
  });
  // park 3 viewports above s22 first
  v.lenis.scrollTo(st.start - 3 * innerHeight, { immediate: true, force: true });
  return st.start;
});
await page.waitForTimeout(800);
await page.evaluate((y) => {
  const v = window.__viture;
  v.lenis.scrollTo(y + 5, { immediate: true, force: true });
}, start);
await page.waitForTimeout(120); // far less than the 0.9s entrance
await page.screenshot({ path: "qa/fling-p0.png" });
console.log("wrote qa/fling-p0.png");
await browser.close();
