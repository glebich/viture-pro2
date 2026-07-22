import { webkit } from "playwright";

const browser = await webkit.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(6000);

const range = await page.evaluate(() => {
  const st = window.__viture.ScrollTrigger.getAll().find(
    (s) => s.vars.scrub && s.trigger.closest("#s06"),
  );
  return { start: st.start, end: st.end };
});
const goto = async (target, steps = 60) => {
  const cur = await page.evaluate(() => window.scrollY);
  for (let i = 1; i <= steps; i++) {
    const y = cur + ((target - cur) * i) / steps;
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(2000);
};
await goto(range.start + 0.7 * (range.end - range.start));

const chain = await page.evaluate(() => {
  let n = document.querySelector("#s06 .stage--d .s06-ca");
  const out = [];
  while (n && n !== document.documentElement) {
    const cs = getComputedStyle(n);
    out.push(
      `${n.tagName}.${(n.className + "").split(" ").slice(0, 2).join(".")}` +
        ` computed=${cs.visibility} inline="${n.style.visibility}"`,
    );
    n = n.parentElement;
  }
  return out;
});
console.log(chain.join("\n"));
await browser.close();
