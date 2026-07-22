// Cleaner dump: full 100ms-grid trace of y / s06 visual top / pin start /
// pin progress from input end to capture end, plus event log.
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:5173";
const wait0 = Number(process.argv[3] ?? 2500);
const plan = process.argv[4] ?? "medium";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));

page.on("framenavigated", (f) => f === page.mainFrame() && console.log("NAVIGATED at", Date.now() % 100000, f.url()));
page.on("crash", () => console.log("PAGE CRASHED"));
await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(wait0);

await page.evaluate(() => {
  const v = window.__viture;
  window.__events = [];
  const ev = (kind, detail) =>
    window.__events.push({ t: Math.round(performance.now()), kind, detail });
  window.addEventListener("s01:retire", () => ev("retire", `s01InDoc=${!!document.getElementById("s01")}`));
  v.ScrollTrigger.addEventListener("refresh", () => {
    const st6 = v.ScrollTrigger.getAll().find(
      (st) => st.vars.pin && st.trigger.closest("section.screen")?.id === "s06"
    );
    ev("refresh", `s06start=${st6 ? Math.round(st6.start) : "?"}`);
  });
  const orig = v.lenis.scrollTo.bind(v.lenis);
  v.lenis.scrollTo = (target, options = {}) => {
    if (options.programmatic !== false)
      ev("scrollTo", `${typeof target === "number" ? Math.round(target) : "el"}${options.immediate ? " imm" : ` dur=${options.duration}`}`);
    return orig(target, options);
  };
  window.__samples = [];
  const tick = () => {
    const v2 = window.__viture;
    const s06 = document.getElementById("s06");
    const st6 = v2.ScrollTrigger.getAll().find(
      (st) => st.vars.pin && st.trigger.closest("section.screen")?.id === "s06"
    );
    const wrap = s06?.querySelector(".stage--d .s06-maskwrap");
    let wx = 0;
    if (wrap) {
      const m = new DOMMatrix(getComputedStyle(wrap).transform);
      wx = Math.round(m.e * 10) / 10; // wordmark travel translateX (visual)
    }
    window.__samples.push({
      t: Math.round(performance.now()),
      y: Math.round((v2.lenis.scroll ?? scrollY) * 10) / 10,
      ny: Math.round(scrollY),
      tgt: Math.round(v2.lenis.targetScroll ?? -1),
      top: s06 ? Math.round(s06.getBoundingClientRect().top * 10) / 10 : null,
      p: st6 ? Math.round(st6.progress * 10000) / 10000 : -1,
      start: st6 ? Math.round(st6.start) : -1,
      wx,
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

await page.mouse.move(960, 540);
const plans = {
  gentle: { delta: 90, gap: 150, count: 76 },
  medium: { delta: 260, gap: 90, count: 27 },
  flick: { delta: 480, gap: 45, count: 15 },
};
const { delta, gap, count } = plans[plan];
let inputEnd = 0;
for (let i = 0; i < count; i++) {
  await page.mouse.wheel(0, delta);
  await page.waitForTimeout(gap);
  const done = await page.evaluate(() => {
    const v = window.__viture;
    const s06 = document.getElementById("s06");
    const box = s06.parentElement?.classList.contains("pin-spacer")
      ? s06.parentElement
      : s06;
    const top = (v.lenis.scroll ?? scrollY) + box.getBoundingClientRect().top;
    return (v.lenis.targetScroll ?? 0) >= top - 4;
  });
  if (done) break;
}
inputEnd = await page.evaluate(() => Math.round(performance.now()));
await page.waitForTimeout(9000);

const dump = await page.evaluate(() =>
  JSON.stringify({ samples: window.__samples ?? [], events: window.__events ?? [] })
);
const { samples, events } = JSON.parse(dump);
if (!samples.length) {
  console.log("NO SAMPLES — instrumentation lost (page reload?)");
  console.log("console errors:", errors.length, errors.slice(0, 8));
  await browser.close();
  process.exit(1);
}
console.log(`plan=${plan} takeover=${wait0} inputEnd=${inputEnd}`);
console.log("events:");
for (const e of events) console.log(`  ${e.t}  ${e.kind}  ${e.detail}`);
console.log("trace (from 500ms before input end, ~100ms grid):");
let lastT = 0;
for (const s of samples) {
  if (s.t < inputEnd - 500) continue;
  if (s.t - lastT < 100) continue;
  lastT = s.t;
  console.log(
    `  t=${s.t} y=${s.y} ny=${s.ny} tgt=${s.tgt} top=${s.top} p=${s.p} start=${s.start} wx=${s.wx}`
  );
}
// wordmark visual stability over the final 5s: max wx drift
const last = samples[samples.length - 1];
const tail5 = samples.filter((s) => s.t > last.t - 5000);
const wxDrift = Math.max(...tail5.map((s) => Math.abs(s.wx - last.wx)));
const yDrift = Math.max(...tail5.map((s) => Math.abs(s.y - last.y)));
console.log(
  `FINAL: y=${last.y} p=${last.p} wx=${last.wx} | last-5s wordmark drift=${wxDrift.toFixed(2)}px, scroll drift=${yDrift.toFixed(2)}px`
);
console.log("sample count:", samples.length, "span:", samples[0].t, "-", samples[samples.length - 1].t);
console.log("console errors:", errors.length, errors.slice(0, 5));
await browser.close();
