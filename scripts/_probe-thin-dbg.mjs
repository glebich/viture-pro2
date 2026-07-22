import { webkit } from "playwright";
const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on("console", (m) => console.log("[pg]", m.text().slice(0,180)));
await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
await page.waitForTimeout(3500);
await page.evaluate(() => {
  const el = document.querySelector("#s15");
  const a = el.querySelector(".stage--d video.s15-vid--anim");
  window.__log = [];
  const t0 = performance.now();
  const iv = setInterval(() => {
    const r = el.getBoundingClientRect();
    window.__log.push([Math.round(performance.now()-t0), Math.round(r.top), Math.round(window.scrollY), a.paused?1:0, +a.currentTime.toFixed(2), getComputedStyle(a).opacity, a.offsetParent===null?0:1, a.readyState]);
  }, 60);
  setTimeout(() => clearInterval(iv), 3000);
  window.scrollTo(0, r0());
  function r0(){ return el.getBoundingClientRect().top + window.scrollY; }
});
await page.waitForTimeout(3200);
const log = await page.evaluate(() => window.__log);
console.log("ms | s15.top | scrollY | paused | t | opacity | hasOffsetParent | ready");
for (const row of log) console.log(row.join("\t"));
await browser.close();
