// Round-8 probe: simulate a GPU context loss/restore on the ambient fluid
// canvas (what Chrome does on GPU-process resets during long sessions) and
// verify the renderer comes back at full quality.
import { chromium } from "playwright";
import sharp from "sharp";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
await page.goto("http://localhost:5173/?only=s14", {
  waitUntil: "networkidle",
});
await page.waitForTimeout(3000);
// expose the raw ambient canvas (the app layer sits over it)
await page.evaluate(() => {
  document.getElementById("app").style.visibility = "hidden";
  document.getElementById("site-header").style.visibility = "hidden";
});
await page.waitForTimeout(300);

const stats = async (path) => {
  const { channels } = await sharp(path)
    .extract({ left: 200, top: 200, width: 800, height: 600 })
    .stats();
  return channels.map((c) => c.mean.toFixed(1)).join(",");
};

await page.screenshot({ path: "qa/r8-ctx-a-fresh.png" });
console.log("A fresh   :", await stats("qa/r8-ctx-a-fresh.png"));

await page.evaluate(() => {
  const c = document.getElementById("fluid-bg");
  const gl = c.getContext("webgl2");
  window.__ext = gl.getExtension("WEBGL_lose_context");
  window.__ext.loseContext();
});
await page.waitForTimeout(600);
await page.screenshot({ path: "qa/r8-ctx-b-lost.png" });
console.log("B lost    :", await stats("qa/r8-ctx-b-lost.png"));

await page.evaluate(() => window.__ext.restoreContext());
await page.waitForTimeout(1500);
const size = await page.evaluate(() => {
  const c = document.getElementById("fluid-bg");
  return { w: c.width, h: c.height, cssW: c.clientWidth, cssH: c.clientHeight };
});
await page.screenshot({ path: "qa/r8-ctx-c-restored.png" });
console.log("C restored:", await stats("qa/r8-ctx-c-restored.png"), size);

await browser.close();
