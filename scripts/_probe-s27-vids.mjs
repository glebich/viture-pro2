// s27 finale-video probe: timed captures around arrival + blend crossing,
// plus video runtime state (currentTime/paused/readyState/source engine).
// Usage: node scripts/_probe-s27-vids.mjs [--browser webkit] [--mobile]
import { chromium, webkit } from "playwright";

const args = process.argv.slice(2);
const browserName = args.includes("--browser")
  ? args[args.indexOf("--browser") + 1]
  : "chromium";
const mobile = args.includes("--mobile");
const tag = `${browserName}${mobile ? "-m" : ""}`;
const vp = mobile ? { width: 375, height: 812 } : { width: 1920, height: 1080 };

const browser = await (browserName === "webkit" ? webkit : chromium).launch();
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

const state = () =>
  page.evaluate(() => {
    const pick = (v) => ({
      src: (v.currentSrc || "").split("/").pop(),
      t: +v.currentTime.toFixed(2),
      paused: v.paused,
      ended: v.ended,
      ready: v.readyState,
      live: v.parentElement.classList.contains("s27-live"),
      visible: v.offsetParent !== null,
    });
    const a = document.querySelector(
      `.stage--${innerWidth < 641 ? "m" : "d"} .s27-vid-a`,
    );
    const b = document.querySelector(
      `.stage--${innerWidth < 641 ? "m" : "d"} .s27-vid-b`,
    );
    return { a: pick(a), b: pick(b) };
  });

// --- arrival: state A plays immediately (no progress param) ---
await page.goto("http://localhost:5173/?only=s27", {
  waitUntil: "domcontentloaded",
});
await page.waitForTimeout(450);
await page.screenshot({ path: `qa/finale-vid/t-${tag}-arrival-0.4s.png` });
const early = await state();
await page.waitForTimeout(1600);
await page.screenshot({ path: `qa/finale-vid/t-${tag}-arrival-2.0s.png` });
const held = await state();
console.log(`[${tag}] arrival 0.4s`, JSON.stringify(early));
console.log(`[${tag}] arrival 2.0s`, JSON.stringify(held));

// --- blend crossing: jump the scrub to 0.5 → B fires its reveal ---
await page.goto("http://localhost:5173/?only=s27&progress=0.5", {
  waitUntil: "domcontentloaded",
});
await page.waitForTimeout(450);
await page.screenshot({ path: `qa/finale-vid/t-${tag}-blend-0.4s.png` });
const bEarly = await state();
await page.waitForTimeout(1600);
const bHeld = await state();
await page.screenshot({ path: `qa/finale-vid/t-${tag}-blend-2.0s.png` });
console.log(`[${tag}] blend 0.4s`, JSON.stringify(bEarly));
console.log(`[${tag}] blend 2.0s`, JSON.stringify(bHeld));

// --- scrub-back re-arm: progress 1 → programmatic back to 0.1 parks B ---
await page.goto("http://localhost:5173/?only=s27&progress=1", {
  waitUntil: "domcontentloaded",
});
await page.waitForTimeout(1800);
const atEnd = await state();
await page.evaluate(() => {
  window.__viture.ScrollTrigger.getAll().forEach((st) => {
    if (st.vars.scrub && st.animation) st.animation.progress(0.1).pause();
  });
});
await page.waitForTimeout(300);
const backA = await state();
await page.screenshot({ path: `qa/finale-vid/t-${tag}-back-0.1.png` });
console.log(`[${tag}] rest p=1`, JSON.stringify(atEnd));
console.log(`[${tag}] back p=0.1`, JSON.stringify(backA));

console.log(`[${tag}] console errors:`, errors.length ? errors : "none");
await browser.close();
