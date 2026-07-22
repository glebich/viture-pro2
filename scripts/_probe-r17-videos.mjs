// r17 probe: s03 fiveyears sequence video (DOM + glass refraction liveness,
// final-frame hold, replay on re-entry) and s11 transparent diopter video
// (engine-correct source pick, alpha over the orange gradient, one-shot).
// Usage: node scripts/_probe-r17-videos.mjs [chromium|webkit] [mobile]
import { chromium, webkit } from "playwright";

const browserName = process.argv[2] ?? "chromium";
const mobile = process.argv[3] === "mobile";
const engine = browserName === "webkit" ? webkit : chromium;
const vp = mobile ? { width: 375, height: 812 } : { width: 1920, height: 1080 };
const tag = `${browserName}${mobile ? "-m" : ""}`;
const OUT = "qa";

const browser = await engine.launch();
const page = await browser.newPage({ viewport: vp });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));

await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
await page.waitForTimeout(3500);

const topOf = (sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    return Math.round(window.scrollY + el.getBoundingClientRect().top);
  }, sel);

const vidState = (sel) =>
  page.evaluate((s) => {
    const vids = [...document.querySelectorAll(s)];
    const v = vids.find((x) => x.offsetParent !== null) ?? vids[0];
    return {
      t: Math.round(v.currentTime * 1000) / 1000,
      paused: v.paused,
      ended: v.ended,
      ready: v.readyState,
      src: (v.currentSrc || "").split("/").pop(),
    };
  }, sel);

const stepTo = async (y, steps = 4, dt = 70) => {
  const y0 = await page.evaluate(() => window.scrollY);
  for (let i = 1; i <= steps; i++) {
    await page.evaluate((yy) => window.scrollTo(0, yy), Math.round(y0 + ((y - y0) * i) / steps));
    await page.waitForTimeout(dt);
  }
};

// ---------- s03 ----------
const s03State = () =>
  page.evaluate(() => {
    const el = document.querySelector("#s03");
    const stage = el.querySelector(".stage--d");
    const inner = stage.querySelector(".s03-inner");
    const canvas = stage.querySelector(".glasstext-canvas");
    const big = stage.querySelector(".s03-big");
    const veilDock = stage.querySelector(".s03-veil--dock");
    return {
      y: window.scrollY,
      top: Math.round(el.getBoundingClientRect().top),
      stScale: getComputedStyle(stage).transform,
      innerOp: getComputedStyle(inner).opacity,
      canvasW: canvas ? canvas.width : 0,
      bigVis: getComputedStyle(big).visibility,
      dockOp: getComputedStyle(veilDock).opacity,
    };
  });

const s03Top = await topOf("#s03");
await stepTo(s03Top);
console.log("s03 arrive:", JSON.stringify(await vidState("#s03 video")), JSON.stringify(await s03State()));
await page.screenshot({ path: `${OUT}/r17-${tag}-s03-t0.png` });
await page.waitForTimeout(400);
console.log("s03 mid:   ", JSON.stringify(await vidState("#s03 video")));
await page.screenshot({ path: `${OUT}/r17-${tag}-s03-mid.png` });
await page.waitForTimeout(1000);
console.log("s03 end:   ", JSON.stringify(await vidState("#s03 video")));
await page.screenshot({ path: `${OUT}/r17-${tag}-s03-end.png` });
await page.waitForTimeout(600);
console.log("s03 hold:  ", JSON.stringify(await vidState("#s03 video")), JSON.stringify(await s03State()));
await page.screenshot({ path: `${OUT}/r17-${tag}-s03-hold.png` });

// replay on re-entry
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(700);
await stepTo(s03Top);
console.log("s03 replay:", JSON.stringify(await vidState("#s03 video")));
await page.screenshot({ path: `${OUT}/r17-${tag}-s03-replay.png` });

// ---------- s11 ----------
const s11Top = await topOf("#s11");
await stepTo(s11Top - Math.round(vp.height * 0.55), 6, 60); // crosses top 60% -> onEnter
await page.waitForTimeout(120);
console.log("s11 enter: ", JSON.stringify(await vidState("#s11 .s11-video video")));
await page.screenshot({ path: `${OUT}/r17-${tag}-s11-t0.png` });
await stepTo(s11Top, 3, 60);
console.log("s11 mid:   ", JSON.stringify(await vidState("#s11 .s11-video video")));
await page.screenshot({ path: `${OUT}/r17-${tag}-s11-mid.png` });
await page.waitForTimeout(1400);
console.log("s11 end:   ", JSON.stringify(await vidState("#s11 .s11-video video")));
await page.screenshot({ path: `${OUT}/r17-${tag}-s11-end.png` });
await page.waitForTimeout(2500); // let the SGS build finish for the final still
await page.screenshot({ path: `${OUT}/r17-${tag}-s11-built.png` });

console.log("console errors:", errors.length ? errors : "none");
await browser.close();
