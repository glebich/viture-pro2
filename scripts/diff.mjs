// Compose my snap vs harvest reference as a difference-blend overlay.
// Usage: node scripts/diff.mjs qa/s18.png harvest/shots/1920_Screen-18-01.png qa/diff-s18.png
import { chromium } from "playwright";
import { readFileSync } from "fs";
import { resolve } from "path";

const [a, b, out] = process.argv.slice(2);
const dataUri = (p) =>
  "data:image/png;base64," + readFileSync(resolve(p)).toString("base64");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.setContent(`
  <style>body{margin:0;background:#000}
  .wrap{position:relative}
  img{position:absolute;left:0;top:0;display:block}
  .b{mix-blend-mode:difference}
  </style>
  <div class="wrap">
    <img class="a" src="${dataUri(a)}">
    <img class="b" src="${dataUri(b)}">
  </div>`);
await page.waitForTimeout(300);
const img = page.locator(".a");
const box = await img.boundingBox();
await page.setViewportSize({ width: Math.ceil(box.width), height: Math.ceil(box.height) });
await page.waitForTimeout(200);
await page.screenshot({ path: out });
await browser.close();
console.log("wrote", out);
