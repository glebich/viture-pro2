import { webkit } from "playwright";

const browser = await webkit.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on("pageerror", (e) => console.log("PAGE ERR:", String(e).slice(0, 200)));

// FULL page: isWebKit true -> html.safari + the culler are ACTIVE (they are
// disabled in the ?only harness), lenis running — the real Safari path.
await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(6000);

const range = await page.evaluate(() => {
  const st = window.__viture.ScrollTrigger.getAll().find(
    (s) => s.vars.scrub && s.trigger.closest("#s06"),
  );
  return { start: st.start, end: st.end };
});
console.log("range", range, await page.evaluate(() => document.documentElement.className));

const state = () =>
  page.evaluate(() => {
    const st = window.__viture.ScrollTrigger.getAll().find(
      (s) => s.vars.scrub && s.trigger.closest("#s06"),
    );
    const sec = document.getElementById("s06");
    const stage = sec.querySelector(".stage--d");
    const pick = (sel) => {
      const n = stage.querySelector(sel);
      const cs = getComputedStyle(n);
      return `vis=${cs.visibility} tf=${cs.transform}`;
    };
    return {
      scrollY: Math.round(window.scrollY),
      stProg: st.progress.toFixed(3),
      secVis: sec.style.visibility || "(unset)",
      ca: pick(".s06-ca"),
      cb: pick(".s06-cb"),
    };
  });

const goto = async (target, steps = 60) => {
  const cur = await page.evaluate(() => window.scrollY);
  for (let i = 1; i <= steps; i++) {
    const y = cur + ((target - cur) * i) / steps;
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(2000);
};

// re-read range after settle in case s01 retired and shifted triggers
const p = (x) => range.start + x * (range.end - range.start);
await goto(p(0.7));
// re-derive true progress-target from the live trigger to be safe
const fix = await page.evaluate(() => {
  const st = window.__viture.ScrollTrigger.getAll().find(
    (s) => s.vars.scrub && s.trigger.closest("#s06"),
  );
  return { start: st.start, end: st.end };
});
const q = (x) => fix.start + x * (fix.end - fix.start);
await goto(q(0.7));
console.log("fwd 0.70", JSON.stringify(await state()));
await page.screenshot({ path: "qa/_wkh-070.png" });
await goto(q(0.75));
await page.screenshot({ path: "qa/_wkh-075.png" });
await goto(q(1.0) + 300);
await goto(q(0.7));
console.log("back 0.70", JSON.stringify(await state()));
await page.screenshot({ path: "qa/_wkh-back-070.png" });
await browser.close();
