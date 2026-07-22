// ctrl (?notextfx) vs live pair capture + threshold diff, header/fluid/video hidden
import { chromium } from "playwright";
import sharp from "sharp";
const BASE = "http://localhost:5173";
const args = process.argv.slice(2); // id query wait bp
const [id, query = "", wait = "5000", bp = "d"] = args;
const browser = await chromium.launch();
const cap = async (variant, out) => {
  const page = await browser.newPage({
    viewport: bp === "m" ? { width: 375, height: 812 } : { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  await page.goto(`${BASE}/?only=${id}${query}${variant}`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "#fluid-bg, video, #site-header { visibility: hidden !important; }" });
  await page.waitForTimeout(Number(wait));
  await page.screenshot({ path: out });
  if (errors.length) console.log(`!! ${out}: ${errors.join(" | ")}`);
  await page.close();
};
const p = query ? query.replace("&progress=", "-p") : "";
const name = `${id}${p}-${bp}`;
const a = `qa/textfx/isolate/${name}-ctrl.png`;
const b = `qa/textfx/isolate/${name}-live.png`;
await cap("&notextfx", a);
await cap("", b);
const A = await sharp(a).raw().toBuffer({ resolveWithObject: true });
const B = await sharp(b).raw().toBuffer({ resolveWithObject: true });
const n = A.info.width * A.info.height, ch = A.info.channels;
let over2 = 0, over24 = 0, over48 = 0, max = 0;
const mask = Buffer.alloc(n * 3);
for (let i = 0; i < n; i++) {
  let d = 0;
  for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(A.data[i*ch+c] - B.data[i*ch+c]));
  if (d > 2) over2++;
  if (d > 24) over24++;
  if (d > 48) over48++;
  if (d > max) max = d;
  mask[i*3] = mask[i*3+1] = mask[i*3+2] = Math.min(255, d * 8);
}
await sharp(mask, { raw: { width: A.info.width, height: A.info.height, channels: 3 } }).png().toFile(`qa/textfx/isolate/_diff-${name}.png`);
console.log(`${name}: max=${max} >2:${over2} >24:${over24} >48:${over48}`);
await browser.close();
