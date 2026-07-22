import { chromium } from "playwright";
import sharp from "sharp";
const BASE = "http://localhost:5173";
const browser = await chromium.launch();
const cap = async (url, out, wait) => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "#fluid-bg, video, #site-header { visibility: hidden !important; }" });
  await page.waitForTimeout(wait);
  await page.screenshot({ path: out });
  await page.close();
};
for (const p of ["0.25", "0.75"]) {
  await cap(`${BASE}/?only=s22&progress=${p}`, `qa/textfx/isolate/_det-a-${p}.png`, 5000);
  await cap(`${BASE}/?only=s22&progress=${p}`, `qa/textfx/isolate/_det-b-${p}.png`, 5000);
  const A = await sharp(`qa/textfx/isolate/_det-a-${p}.png`).raw().toBuffer({ resolveWithObject: true });
  const B = await sharp(`qa/textfx/isolate/_det-b-${p}.png`).raw().toBuffer({ resolveWithObject: true });
  const n = A.info.width * A.info.height, ch = A.info.channels;
  let over24 = 0, max = 0;
  for (let i = 0; i < n; i++) {
    let d = 0;
    for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(A.data[i*ch+c] - B.data[i*ch+c]));
    if (d > 24) over24++;
    if (d > max) max = d;
  }
  console.log(`live-vs-live p=${p}: max=${max} >24:${over24}`);
}
await browser.close();
