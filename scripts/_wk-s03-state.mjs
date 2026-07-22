import { webkit } from "playwright";
const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
await page.waitForTimeout(3500);
const top = await page.evaluate(() => Math.round(window.scrollY + document.querySelector("#s03").getBoundingClientRect().top));
for (let i = 1; i <= 4; i++) { await page.evaluate((y) => window.scrollTo(0, y), Math.round(top * i / 4)); await page.waitForTimeout(70); }
await page.waitForTimeout(2000);
const st = await page.evaluate(() => {
  const el = document.querySelector("#s03");
  const inner = el.querySelector(".stage--d .s03-inner");
  const canvas = el.querySelector(".stage--d .glasstext-canvas");
  const big = el.querySelector(".stage--d .s03-big");
  const trigs = window.ScrollTrigger ? "global" : "none";
  return {
    scrollY: window.scrollY,
    elTop: Math.round(el.getBoundingClientRect().top),
    innerOpacity: getComputedStyle(inner).opacity,
    innerVis: getComputedStyle(inner).visibility,
    canvas: !!canvas,
    bigVis: big ? getComputedStyle(big).visibility : null,
    pinned: el.parentElement.className,
  };
});
console.log(JSON.stringify(st));
await page.screenshot({ path: "qa/r17-wk-s03-state.png" });
await browser.close();
