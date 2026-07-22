// Focused s11 replay-cycle poll: watch video state every 300ms for 8s.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
await page.waitForTimeout(3500);
const topOf = async (sel) => {
  let prev = -1;
  for (let i = 0; i < 20; i++) {
    const v = await page.evaluate((s) => {
      const el = document.querySelector(s);
      return Math.round(window.scrollY + el.getBoundingClientRect().top);
    }, sel);
    if (v === prev) return v;
    prev = v;
    await page.waitForTimeout(700);
  }
  return prev;
};
const s11Top = await topOf("#s11");
for (let i = 1; i <= 5; i++) {
  await page.evaluate((y) => window.scrollTo(0, y), Math.round((s11Top * i) / 5));
  await page.waitForTimeout(70);
}
for (let i = 0; i < 27; i++) {
  const st = await page.evaluate(() => {
    const vids = [...document.querySelectorAll("#s11 .s11-video video")];
    const v = vids.find((x) => x.offsetParent !== null);
    const r = document.querySelector("#s11").getBoundingClientRect();
    return { t: Math.round(v.currentTime * 100) / 100, paused: v.paused, ended: v.ended, top: Math.round(r.top), bottom: Math.round(r.bottom) };
  });
  console.log((i * 300) + "ms", JSON.stringify(st));
  await page.waitForTimeout(300);
}
await browser.close();
