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
  await cap(`${BASE}/?only=s22&progress=${p}&notextfx`, `qa/textfx/isolate/_d2-ctrl-${p}.png`, 5000);
  const A = await sharp(`qa/textfx/isolate/_d2-ctrl-${p}.png`).raw().toBuffer({ resolveWithObject: true });
  const B = await sharp(`qa/textfx/isolate/_det-a-${p}.png`).raw().toBuffer({ resolveWithObject: true });
  const n = A.info.width * A.info.height, ch = A.info.channels;
  let over24 = 0, over48 = 0, max = 0;
  const mask = Buffer.alloc(n * 3);
  for (let i = 0; i < n; i++) {
    let d = 0;
    for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(A.data[i*ch+c] - B.data[i*ch+c]));
    if (d > 24) over24++;
    if (d > 48) over48++;
    if (d > max) max = d;
    mask[i*3] = mask[i*3+1] = mask[i*3+2] = Math.min(255, d * 8);
  }
  await sharp(mask, { raw: { width: A.info.width, height: A.info.height, channels: 3 } }).png().toFile(`qa/textfx/isolate/_d2-diff-${p}.png`);
  console.log(`ctrl-vs-live p=${p}: max=${max} >24:${over24} >48:${over48}`);
}
await browser.close();
