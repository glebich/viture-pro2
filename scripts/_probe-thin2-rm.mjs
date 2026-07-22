// reduced-motion still: static settled frame, no loop, no sequence fetches
import { chromium } from "playwright";
const browser = await chromium.launch();
const pctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  reducedMotion: "reduce",
});
const page = await pctx.newPage();
const frameReqs = [];
page.on("request", (r) => r.url().includes("/assets/thin-frames/") && frameReqs.push(r.url().split("/").slice(-2).join("/")));
await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
await page.waitForTimeout(3500);
await page.evaluate(() => {
  const el = document.querySelector("#s15");
  window.__viture.lenis.scrollTo(el.getBoundingClientRect().top + window.scrollY, { immediate: true });
});
await page.waitForTimeout(1500);
const st = await page.evaluate(() => window.__s15thin?.state ?? "no-handle (still mode)");
console.log("state handle:", JSON.stringify(st));
console.log("thin-frames fetched:", frameReqs);
console.log(
  "expect only the poster frame:",
  frameReqs.length === 1 && frameReqs[0] === "static/ts-29.webp" ? "PASS" : "FAIL",
);
await page.screenshot({ path: "qa/thin2/d-chromium-reduced-motion.png" });
await browser.close();
