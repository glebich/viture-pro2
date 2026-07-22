// r18 probe: s03 scroll-scrubbed alpha frame sequence (bidirectional,
// frame-exact per position, live through the glass) and s11 transparent
// diopter video with the 2s replay cycle.
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
try {
  await page.waitForSelector("#s03 .stage--d", { state: "attached", timeout: 20000 });
} catch (e) {
  console.log("sections never mounted; console errors:", errors);
  process.exit(1);
}
await page.waitForTimeout(3500);

// WebKit settles ScrollTrigger layout late — poll until stable.
const topOf = async (sel) => {
  let prev = -1;
  for (let i = 0; i < 20; i++) {
    const v = await page.evaluate((s) => {
      const el = document.querySelector(s);
      return Math.round(window.scrollY + el.getBoundingClientRect().top);
    }, sel);
    if (v === prev) return v;
    prev = v;
    await page.waitForTimeout(700);
  }
  return prev;
};

const jump = (y) =>
  page.evaluate((yy) => {
    const l = window.__viture?.lenis;
    if (l) l.scrollTo(yy, { immediate: true });
    else window.scrollTo(0, yy);
  }, y);
const stepTo = async (y, steps = 4, dt = 70) => {
  const y0 = await page.evaluate(() => window.scrollY);
  for (let i = 1; i <= steps; i++) {
    await jump(Math.round(y0 + ((y - y0) * i) / steps));
    await page.waitForTimeout(dt);
  }
};

// ---------- s03: bidirectional frame scrub ----------
const s03Top = await topOf("#s03");
const pinLen = Math.round(vp.height * (mobile ? 1.5 : 3));
const range = Math.round(pinLen * (mobile ? 0.3 : 0.35));
const STEPS = 8;
// glasses slot clip (design px == viewport px at these exact viewports)
const clip = mobile
  ? { x: 0, y: 150, width: 375, height: 372 }
  : { x: 245, y: 156, width: 1365, height: 768 };
// glyph band crossing the product (glass refraction evidence, desktop only)
const glyphClip = { x: 1350, y: 380, width: 550, height: 320 };

for (const dir of ["fwd", "back"]) {
  const ks = dir === "fwd" ? [...Array(STEPS + 1).keys()] : [...Array(STEPS + 1).keys()].reverse();
  for (const k of ks) {
    const y = s03Top + Math.round((range * k) / STEPS);
    await jump(y);
    await page.waitForTimeout(900); // scrub 0.6 settle
    await page.screenshot({ path: `${OUT}/r18-${tag}-s03-${dir}-${String(k).padStart(2, "0")}.png`, clip });
    if (!mobile)
      await page.screenshot({ path: `${OUT}/r18-${tag}-s03-${dir}-${String(k).padStart(2, "0")}-glyph.png`, clip: glyphClip });
  }
}
// full-stage stills at rest and at frame-hold point
await jump(s03Top);
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/r18-${tag}-s03-rest.png` });
await jump(s03Top + range);
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/r18-${tag}-s03-held.png` });

// ---------- s11: canvas frames — auto cycle + drag scrub ----------
// Detect the displayed frame by matching sampled canvas pixels against the
// 30 source frames (images cache after the first call).
const detectFrame = () =>
  page.evaluate(async () => {
    const cv = document.querySelector("#s11 .s11-video canvas:not([data-x])");
    const vis = [...document.querySelectorAll("#s11 .s11-video canvas")].find(
      (c) => c.offsetParent !== null,
    );
    const c = (vis ?? cv).getContext("2d");
    const pts = [[500,700],[800,600],[1000,750],[1200,850],[1400,700],[1600,900],[700,950],[900,500],[1100,650],[1300,950]];
    const cur = pts.map(([x, y]) => [...c.getImageData(x, y, 1, 1).data]);
    if (!window.__dgFrames) {
      window.__dgFrames = await Promise.all(
        [...Array(30).keys()].map(
          (i) =>
            new Promise((res) => {
              const im = new Image();
              im.onload = () => res(im);
              im.src = `/assets/dg-frames/dg-${String(i).padStart(2, "0")}.webp`;
            }),
        ),
      );
    }
    const tmp = document.createElement("canvas");
    tmp.width = 1920; tmp.height = 1080;
    const t = tmp.getContext("2d", { willReadFrequently: true });
    let best = -1, bestD = 1e12;
    for (let i = 0; i < 30; i++) {
      t.clearRect(0, 0, 1920, 1080);
      t.drawImage(window.__dgFrames[i], 0, 0);
      let d = 0;
      pts.forEach(([x, y], j) => {
        const pp = t.getImageData(x, y, 1, 1).data;
        for (let k = 0; k < 4; k++) d += Math.abs(pp[k] - cur[j][k]);
      });
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  });

const s11Top = await topOf("#s11");
await stepTo(s11Top, 6, 60);
// cycle trace: expect rise 0->29, hold ~2s at 29, then reset low
const trace = [];
for (let i = 0; i < 14; i++) {
  trace.push(await detectFrame());
  await page.waitForTimeout(320);
}
console.log("s11 cycle trace:", JSON.stringify(trace));
await page.screenshot({ path: `${OUT}/r18-${tag}-s11-cycle.png` });

// ---- drag scrub (desktop: real mouse; mobile: synthetic touch pointers)
const dragPoint = mobile ? { x: 300, y: 420 } : { x: 700, y: 850 };
const doDrag = async (dx, stepsN = 4) => {
  if (!mobile) {
    await page.mouse.move(dragPoint.x, dragPoint.y);
    await page.mouse.down();
    for (let i = 1; i <= stepsN; i++) {
      await page.mouse.move(dragPoint.x + (dx * i) / stepsN, dragPoint.y);
      await page.waitForTimeout(60);
    }
    return;
  }
  await page.evaluate(({ x, y, dx, stepsN }) => {
    const cv = [...document.querySelectorAll("#s11 .s11-video canvas")].find((c) => c.offsetParent !== null);
    const ev = (type, cx) =>
      cv.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: "touch", clientX: cx, clientY: y, bubbles: true }));
    ev("pointerdown", x);
    for (let i = 1; i <= stepsN; i++) ev("pointermove", x + (dx * i) / stepsN);
  }, { x: dragPoint.x, y: dragPoint.y, dx, stepsN });
};
const endDrag = async () => {
  if (!mobile) { await page.mouse.up(); return; }
  await page.evaluate(({ x, y }) => {
    const cv = [...document.querySelectorAll("#s11 .s11-video canvas")].find((c) => c.offsetParent !== null);
    cv.dispatchEvent(new PointerEvent("pointerup", { pointerId: 7, pointerType: "touch", clientX: x, clientY: y, bubbles: true }));
  }, dragPoint);
};

// wait until the hold plateau so drag starts from a known frame (29)
await page.waitForTimeout(1500);
const f0 = await detectFrame();
await doDrag(-90); // LEFT drag -> forward (clamped at 29 if already there)
const fLeft = await detectFrame();
await page.screenshot({ path: `${OUT}/r18-${tag}-s11-drag-left.png` });
await doDrag(-90 + 135); // net +45px right of start -> backward ~5 frames
const fRight1 = await detectFrame();
await doDrag(-90 + 225); // net +135px right -> backward ~15 frames
const fRight2 = await detectFrame();
await page.screenshot({ path: `${OUT}/r18-${tag}-s11-drag-right.png` });
await endDrag();
console.log(
  `s11 drag: start=${f0} afterLeft90=${fLeft} afterNetRight45=${fRight1} afterNetRight135=${fRight2}`,
);
// cycle resumes ~2s after release
await page.waitForTimeout(2600);
const resumeA = await detectFrame();
await page.waitForTimeout(400);
const resumeB = await detectFrame();
console.log(`s11 resume after drag: ${resumeA} -> ${resumeB} (expect motion)`);
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/r18-${tag}-s11-built.png` });

console.log("console errors:", errors.length ? errors : "none");
await browser.close();
