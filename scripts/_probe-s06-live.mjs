// Live-scroll repro: drive REAL scrolling (scrub traverses tweens in order,
// video playing) through the s06 pin and inspect .s06-ca at card beats.
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
page.on("console", (m) => m.type() === "error" && console.log("CONSOLE ERR:", m.text().slice(0, 200)));
page.on("pageerror", (e) => console.log("PAGE ERR:", String(e).slice(0, 200)));

await page.goto("http://localhost:5173/?only=s06", { waitUntil: "networkidle" });
await page.waitForTimeout(3500);

const range = await page.evaluate(() => {
  const st = window.__viture.ScrollTrigger.getAll().find(
    (s) => s.vars.scrub && s.trigger.closest("#s06"),
  );
  return { start: st.start, end: st.end };
});
console.log("pin range", range);

const inspect = async (label) => {
  const info = await page.evaluate(() => {
    const stage = document.querySelector("#s06 .stage--d");
    const st = window.__viture.ScrollTrigger.getAll().find(
      (s) => s.vars.scrub && s.trigger.closest("#s06"),
    );
    const pick = (sel) => {
      const n = stage.querySelector(sel);
      const cs = getComputedStyle(n);
      const r = n.getBoundingClientRect();
      return `op=${cs.opacity} vis=${cs.visibility} tf=${cs.transform} y=${Math.round(r.y)} h=${Math.round(r.height)}`;
    };
    return {
      stProg: st.progress.toFixed(3),
      tlProg: st.animation.progress().toFixed(3),
      card: pick(".s06-card"),
      ca: pick(".s06-ca"),
      cb: pick(".s06-cb"),
    };
  });
  console.log(label, JSON.stringify(info, null, 1));
};

// scroll down in steps through the pin to p target, waiting for scrub catch-up
const goto = async (p, steps = 30) => {
  const target = range.start + p * (range.end - range.start);
  const cur = await page.evaluate(() => window.scrollY);
  for (let i = 1; i <= steps; i++) {
    const y = cur + ((target - cur) * i) / steps;
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(1200); // scrub 0.6 settle
};

// forward pass: rest at 0.70 (card risen, pre-roll)
await goto(0.7);
await inspect("fwd p0.70");
await page.screenshot({ path: "qa/_live-fwd-070.png" });

// continue to 1.0, then back up to 0.70 (the scrub-back path)
await goto(1.0);
await inspect("fwd p1.00");
await page.screenshot({ path: "qa/_live-fwd-100.png" });

await goto(0.7);
await inspect("back p0.70");
await page.screenshot({ path: "qa/_live-back-070.png" });

await goto(0.62);
await inspect("back p0.62");
await page.screenshot({ path: "qa/_live-back-062.png" });

await browser.close();
