// Round-8 probe: geometry of the s02->s03 fold + fluid canvas degradation
// after repeated full-page scroll cycles.
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
page.on("console", (m) => console.log("[console]", m.text()));
await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

const geo = await page.evaluate(() => {
  const y = window.scrollY;
  const box = (id) => {
    const el = document.getElementById(id);
    const host = el?.parentElement?.classList.contains("pin-spacer")
      ? el.parentElement
      : el;
    const r = host.getBoundingClientRect();
    return { id, top: y + r.top, bottom: y + r.bottom };
  };
  return {
    s01: box("s01"),
    s02: box("s02"),
    s03: box("s03"),
    docH: document.documentElement.scrollHeight,
    fluid: (() => {
      const c = document.getElementById("fluid-bg");
      return { w: c.width, h: c.height, cssW: c.clientWidth, cssH: c.clientHeight };
    })(),
  };
});
console.log(JSON.stringify(geo, null, 2));

// listen for context loss on the fluid canvas
await page.evaluate(() => {
  const c = document.getElementById("fluid-bg");
  window.__fluidEvents = [];
  c.addEventListener("webglcontextlost", () =>
    window.__fluidEvents.push("lost@" + Math.round(performance.now())),
  );
  c.addEventListener("webglcontextrestored", () =>
    window.__fluidEvents.push("restored@" + Math.round(performance.now())),
  );
});

// scroll the whole page down and up 4 times (coarse steps, real wheel-less)
const docH = geo.docH;
for (let cycle = 0; cycle < 4; cycle++) {
  for (let f = 0; f <= 1.001; f += 0.05) {
    await page.evaluate((yy) => window.scrollTo(0, yy), Math.round(docH * f));
    await page.waitForTimeout(60);
  }
  for (let f = 1; f >= -0.001; f -= 0.05) {
    await page.evaluate((yy) => window.scrollTo(0, yy), Math.round(docH * f));
    await page.waitForTimeout(60);
  }
  const st = await page.evaluate(() => {
    const c = document.getElementById("fluid-bg");
    return {
      w: c.width,
      h: c.height,
      cssW: c.clientWidth,
      cssH: c.clientHeight,
      events: window.__fluidEvents,
      contexts: performance.now(),
    };
  });
  console.log("after cycle", cycle + 1, JSON.stringify(st));
}

// scroll to a fluid-visible spot (s14 dark neutral area) and snap
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(1000);
await page.screenshot({ path: "qa/r8-fluid-after-cycles-top.png" });
await browser.close();
console.log("done");
