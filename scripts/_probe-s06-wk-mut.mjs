import { webkit } from "playwright";

const browser = await webkit.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on("console", (m) => {
  const t = m.text();
  if (t.startsWith("[MUT]") || t.startsWith("[TL]")) console.log(t);
});

await page.addInitScript(() => {
  const arm = () => {
    const ca = document.querySelector("#s06 .stage--d .s06-ca");
    if (!ca) return void setTimeout(arm, 200);
    let last = "";
    const mo = new MutationObserver(() => {
      const v = ca.style.visibility;
      if (v !== last) {
        last = v;
        let prog = "n/a";
        try {
          const st = (window.__viture?.ScrollTrigger?.getAll() || []).find(
            (s) => s.vars.scrub && s.trigger.closest("#s06"),
          );
          if (st) prog = `${st.progress.toFixed(3)}/tl=${st.animation.progress().toFixed(3)}`;
        } catch {}
        console.log(
          `[MUT] t=${(performance.now() / 1000).toFixed(2)}s ca.style.visibility="${v}" prog=${prog} scrollY=${Math.round(window.scrollY)}`,
        );
      }
    });
    mo.observe(ca, { attributes: true, attributeFilter: ["style"] });
    console.log("[MUT] observer armed");
  };
  arm();
});

await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(6000);
const range = await page.evaluate(() => {
  const st = window.__viture.ScrollTrigger.getAll().find(
    (s) => s.vars.scrub && s.trigger.closest("#s06"),
  );
  return { start: st.start, end: st.end };
});
console.log("[TL] range", JSON.stringify(range));
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
const fin = await page.evaluate(() => {
  const st = window.__viture.ScrollTrigger.getAll().find(
    (s) => s.vars.scrub && s.trigger.closest("#s06"),
  );
  const ca = document.querySelector("#s06 .stage--d .s06-ca");
  return `prog=${st.progress.toFixed(3)} inline="${ca.style.visibility}"`;
});
console.log("[TL] final", fin);
await browser.close();
