import { chromium } from "playwright";
const [id, query = "", wait = "4200", bp = "d", out] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: bp === "m" ? { width: 375, height: 812 } : { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.goto(`http://localhost:5173/?only=${id}${query}`, { waitUntil: "networkidle" });
await page.waitForTimeout(Number(wait));
await page.evaluate(() => {
  document.querySelectorAll("video").forEach((v) => { v.pause(); try { v.currentTime = 0; } catch {} });
});
await page.waitForTimeout(400);
await page.screenshot({ path: out });
console.log(out, errors.length ? "ERRORS: " + errors.join(" | ") : "ok");
await browser.close();
