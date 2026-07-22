import { webkit } from "playwright";
const browser = await webkit.launch();
const shots = [
  ["s02", "", 4600, "d"], ["s23", "", 5600, "d"], ["s22", "&progress=0.25", 5000, "d"], ["s14", "&progress=1", 5000, "d"],
];
for (const [id, q, wait, bp] of shots) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  await page.goto(`http://localhost:5173/?only=${id}${q}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(wait);
  const p = q ? q.replace("&progress=", "-p") : "";
  await page.screenshot({ path: `qa/textfx/wk-${id}${p}-${bp}.png` });
  console.log(`wk-${id}${p}${errors.length ? "  ERRORS: " + errors.join(" | ") : "  ok"}`);
  await page.close();
}
await browser.close();
