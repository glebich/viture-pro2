// Screenshot a section (or the full page at a scroll position) headlessly.
// Usage:
//   node scripts/snap.mjs s06 --out qa/s06.png                 (desktop 1920×1080)
//   node scripts/snap.mjs s22 --progress 0.5 --out qa/s22-mid.png
//   node scripts/snap.mjs s14 --mobile --out qa/m14.png        (375×812)
//   node scripts/snap.mjs full --scroll 3600 --out qa/at3600.png
//   node scripts/snap.mjs full --hover ".hd-logo" --out qa/logo-hover.png
//   node scripts/snap.mjs full --wait 4000 --out qa/after-intro.png
//     (--wait: extra settle ms after the base 3s — e.g. to let the s01
//      loader auto-glide land on s02 and retire before capturing)
import { chromium, webkit } from "playwright";

const args = process.argv.slice(2);
const target = args[0];
const get = (flag, dflt) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : dflt;
};
const mobile = args.includes("--mobile");
const out = get("--out", `qa/${target}${mobile ? "-m" : ""}.png`);
const progress = get("--progress", null);
const scroll = get("--scroll", null);
const hover = get("--hover", null);
const base = get("--base", "http://localhost:5173");
const browserName = get("--browser", "chromium");

const vp = mobile ? { width: 375, height: 812 } : { width: 1920, height: 1080 };
const browser = await (browserName === "webkit" ? webkit : chromium).launch();
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });

const extraQs = get("--qs", null); // extra query params, e.g. "gt_spec=0&gt_streak=0"
let url = base + "/";
if (target !== "full") {
  url += `?only=${target}`;
  if (progress !== null) url += `&progress=${progress}`;
  if (extraQs) url += `&${extraQs}`;
} else if (extraQs) {
  url += `?${extraQs}`;
}
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(3000); // fonts + entrance animations settle
// --wait <ms>: extra settle time before the scroll/shot — e.g. to let the
// s01 loader auto-glide land on s02 and retire (it clobbers early
// programmatic scrolls, esp. mobile), or to let TIME-based (non-scrubbed)
// animations such as s15's auto camera pan reach a later phase.
const extraWait = get("--wait", null);
if (extraWait !== null) await page.waitForTimeout(Number(extraWait));
if (target === "full" && scroll !== null) {
  await page.evaluate((y) => window.scrollTo(0, Number(y)), scroll);
  await page.waitForTimeout(1000);
}
if (hover) {
  await page.hover(hover);
  await page.waitForTimeout(500); // let the hover transition settle
}
// --flick: burst of wheel input right before the shot, NO settle — captures
// velocity-reactive effects (scrollfx stage parallax) mid-motion, e.g. to
// inspect section folds while scrolling fast.
if (args.includes("--flick")) {
  await page.mouse.move(vp.width / 2, vp.height / 2);
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 260);
    await page.waitForTimeout(16);
  }
}
await page.screenshot({ path: out });
await browser.close();
console.log("wrote", out, `${vp.width}x${vp.height}`);
