import { webkit } from "playwright";

const browser = await webkit.launch();
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

const vidState = async () =>
  page.evaluate(() => {
    const v = document.querySelector("#s06 .stage--d .s06-vid video");
    return { rs: v.readyState, t: v.currentTime.toFixed(2), paused: v.paused };
  });

const goto = async (p, steps = 30) => {
  const target = range.start + p * (range.end - range.start);
  const cur = await page.evaluate(() => window.scrollY);
  for (let i = 1; i <= steps; i++) {
    const y = cur + ((target - cur) * i) / steps;
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(1200);
};

console.log("video:", JSON.stringify(await vidState()));
await goto(0.7);
console.log("video p0.70:", JSON.stringify(await vidState()));
await page.screenshot({ path: "qa/_wk-fwd-070.png" });
await goto(0.75);
await page.screenshot({ path: "qa/_wk-fwd-075.png" });
await goto(1.0);
await page.screenshot({ path: "qa/_wk-fwd-100.png" });
await goto(0.7);
await page.screenshot({ path: "qa/_wk-back-070.png" });
await browser.close();
