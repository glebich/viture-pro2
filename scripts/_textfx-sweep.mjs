import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
mkdirSync("qa/textfx/sweep", { recursive: true });
const BASE = "http://localhost:5173";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
const caps = [
  ["s22", [0.10, 0.13, 0.15, 0.17, 0.19, 0.25, 0.36, 0.42, 0.44, 0.5, 0.81, 0.9, 1]],
  ["s24", [0.15, 0.24, 0.28, 0.32, 0.36, 0.39, 0.5, 0.74, 0.82, 0.89, 1]],
];
for (const [id, ps] of caps) {
  for (const p of ps) {
    await page.goto(`${BASE}/?only=${id}&progress=${p}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2600);
    await page.screenshot({ path: `qa/textfx/sweep/${id}-p${p}.png` });
  }
}
console.log(errors.length ? "ERRORS: " + errors.join(" | ") : "console clean");
await browser.close();
