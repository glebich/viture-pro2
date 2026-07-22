// Export a transparent-background COMFORT wordmark from qa/comfort-hero.html
// (typographic fallback for the s05 LIGHT -> COMFORT swap; the Figma art
// frame was not reachable via the MCP node probes).
// Calibrates fs/ls so the ink box matches the LIGHT art's 1382px target,
// then screenshots the 1920x1080 frame with alpha at 2x.
import { chromium } from "playwright";
import path from "node:path";

const file =
  "file://" + path.resolve("qa/comfort-hero.html") + "?fs=254.7&dx=-14";
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 2,
});
await page.goto(file);
await page.waitForFunction(() => document.title === "ready");
// measure ink width of the word at default fs
const ink = await page.evaluate(() => {
  const b = document.getElementById("word").getBBox();
  return { x: b.x, y: b.y, w: b.width, h: b.height };
});
console.log("ink bbox @fs254.7:", JSON.stringify(ink));

// alpha mode: keep only the wordmark (with its glow), transparent bg
await page.addStyleTag({
  content: `
    html, body, .frame { background: transparent !important; }
    .glow, .eyebrow { display: none !important; }
  `,
});
await page.waitForTimeout(200);
const frame = page.locator("#frame");
await frame.screenshot({
  path: "qa/_comfort-word-alpha.png",
  omitBackground: true,
});
await browser.close();
console.log("wrote qa/_comfort-word-alpha.png");
