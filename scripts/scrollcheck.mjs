// Full-page scroll simulation: steps through the document, screenshots
// checkpoints, reports console errors and per-band main-thread FPS.
// Usage: node scripts/scrollcheck.mjs [--no-shots] [--bands N] [--browser webkit|chromium]
import { chromium, webkit } from "playwright";

const args = process.argv.slice(2);
const noShots = args.includes("--no-shots");
const bandsArg = args.indexOf("--bands");
const bandVh = bandsArg >= 0 ? Number(args[bandsArg + 1]) : 3; // viewports per FPS band
const browserArg = args.indexOf("--browser");
const browserName = browserArg >= 0 ? args[browserArg + 1] : "chromium";
const baseArg = args.indexOf("--base");
const base = baseArg >= 0 ? args[baseArg + 1] : "http://localhost:5173";
const waitArg = args.indexOf("--wait");
const extraWait = waitArg >= 0 ? Number(args[waitArg + 1]) : 0; // extra settle ms (loader retirement)
const dense = args.includes("--dense"); // screenshot every half-viewport step instead of every 4 viewports

// the frame-rate-limit args are chromium-only; webkit rejects unknown flags
const browser =
  browserName === "webkit"
    ? await webkit.launch()
    : await chromium.launch({
        args: ["--disable-frame-rate-limit", "--disable-gpu-vsync"],
      });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));

await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
if (extraWait > 0) await page.waitForTimeout(extraWait);

const docH = await page.evaluate(() => document.documentElement.scrollHeight);
const vh = 1080;

// screenshot checkpoints
if (!noShots) {
  for (let y = 0; y + vh <= docH; y += Math.round(vh / 2)) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(120);
    if (dense || y % (vh * 4) < vh / 2) {
      await page.screenshot({ path: `qa/scroll-${String(y).padStart(6, "0")}.png` });
    }
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
}

// FPS probe: scroll steadily through each band while counting rAF frames.
// Scrolling is driven inside rAF (constant px/frame) so a janky main thread
// directly lowers the measured frame rate.
const bands = [];
const bandPx = vh * bandVh;
for (let y0 = 0; y0 < docH - vh; y0 += bandPx) {
  const y1 = Math.min(y0 + bandPx, docH - vh);
  const r = await page.evaluate(
    ([a, b]) =>
      new Promise((res) => {
        window.scrollTo(0, a);
        const pxPerFrame = 30; // ~1800px/s at 60fps — brisk user scroll
        let y = a;
        let frames = 0;
        let worst = 0;
        let prev = performance.now();
        const t0 = prev;
        const tick = (now) => {
          const dt = now - prev;
          prev = now;
          if (frames > 0 && dt > worst) worst = dt;
          frames++;
          y += pxPerFrame;
          window.scrollTo(0, Math.min(y, b));
          if (y < b && now - t0 < 8000) requestAnimationFrame(tick);
          else {
            const ms = performance.now() - t0;
            res({
              fps: Math.round((frames * 1000) / ms),
              worstFrameMs: Math.round(worst),
            });
          }
        };
        requestAnimationFrame(tick);
      }),
    [y0, y1],
  );
  bands.push({ from: y0, to: y1, ...r });
  await page.waitForTimeout(150);
}

const avg = Math.round(bands.reduce((s, b) => s + b.fps, 0) / (bands.length || 1));
const min = bands.reduce((m, b) => Math.min(m, b.fps), Infinity);
console.log(JSON.stringify({ docH, avgFps: avg, minFps: min, bands, errors: errors.slice(0, 10) }, null, 2));
await browser.close();
