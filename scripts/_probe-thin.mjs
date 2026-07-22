// s15 thin-video cadence probe: timed state dumps + captures. Scrolls via
// lenis.scrollTo(immediate) so smooth-scroll/snap can't drift the page.
// Usage: node scripts/_probe-thin.mjs [--mobile] [--browser webkit|chromium]
import { chromium, webkit } from "playwright";

const args = process.argv.slice(2);
const mobile = args.includes("--mobile");
const browserName = args.includes("--browser")
  ? args[args.indexOf("--browser") + 1]
  : "chromium";
const tag = (mobile ? "m-" : "d-") + browserName;

const browser = browserName === "webkit" ? await webkit.launch() : await chromium.launch();
const page = await browser.newPage({
  viewport: mobile ? { width: 375, height: 812 } : { width: 1920, height: 1080 },
});
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));

await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
await page.waitForTimeout(3500);

const t0 = Date.now();
const state = () =>
  page.evaluate(() => {
    const pick = (sel) =>
      [...document.querySelectorAll(sel)].filter((v) => v.offsetParent !== null)
        .map((v) => ({
          t: +v.currentTime.toFixed(3),
          paused: v.paused,
          op: +(+getComputedStyle(v).opacity).toFixed(2),
          ready: v.readyState,
          src: (v.currentSrc || "").split("/").pop(),
        }));
    return {
      atS15: Math.abs(document.querySelector("#s15").getBoundingClientRect().top) < 4,
      anim: pick("video.s15-vid--anim")[0],
      stat: pick("video.s15-vid--static")[0],
    };
  });
const note = async (name) => {
  const s = await state();
  console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${name}`, JSON.stringify(s));
};
const shot = (name) => page.screenshot({ path: `qa/thin/${tag}-${name}.png` });
const goto15 = () =>
  page.evaluate(() => {
    const el = document.querySelector("#s15");
    window.__viture.lenis.scrollTo(el.getBoundingClientRect().top + window.scrollY, { immediate: true });
  });

await goto15(); // arrival
await page.waitForTimeout(250);
await note("arrival+0.25s anim playing?");
await shot("arrival");
await page.waitForTimeout(1400);
await note("~+2s static holding?");
await shot("hold");
await page.waitForTimeout(8000);
await note("~+10s mid-break still static?");
await page.waitForTimeout(7000);
await note("~+17s replaying?");
await shot("replay");

await page.evaluate(() => window.__viture.lenis.scrollTo(0, { immediate: true }));
await page.waitForTimeout(300);
await note("offscreen paused+reset?");
await page.waitForTimeout(2000);
await note("offscreen+2s still parked?");

await goto15(); // re-entry
await page.waitForTimeout(250);
await note("re-entry+0.25s anim playing?");
await shot("reentry");

console.log("console errors:", errors.length ? errors : "none");
await browser.close();
