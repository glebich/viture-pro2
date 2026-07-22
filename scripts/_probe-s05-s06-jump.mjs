// Reproduce the client's "jump after COMFORT" — real wheel scroll from s05
// into the s06 pin start at 3 speeds, sampling per-frame scrollY + s06 pin
// progress + programmatic lenis.scrollTo activity.
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:5173";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));

await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(8000); // intro + auto-glide + s01 retirement

const geo = await page.evaluate(() => {
  const v = window.__viture;
  const y = window.scrollY;
  const secs = {};
  for (const el of document.querySelectorAll("section.screen")) {
    const box = el.parentElement?.classList.contains("pin-spacer")
      ? el.parentElement
      : el;
    secs[el.id] = y + box.getBoundingClientRect().top;
  }
  const pins = {};
  for (const st of v.ScrollTrigger.getAll()) {
    if (!st.vars.pin) continue;
    const sec = st.trigger.closest?.("section.screen") ?? st.trigger;
    pins[sec.id] = { start: st.start, end: st.end };
  }
  return { secs, pins, vh: innerHeight, s01gone: !document.getElementById("s01") };
});
console.log("s01 retired:", geo.s01gone);
console.log("s05 top:", geo.secs.s05, " s06 top:", geo.secs.s06, " s06 pin:", JSON.stringify(geo.pins.s06));

// instrument: log every ANIMATED programmatic lenis.scrollTo (snap glide,
// paginator). Also install a per-frame sampler we can start/stop.
await page.evaluate(() => {
  const v = window.__viture;
  window.__prog = [];
  const orig = v.lenis.scrollTo.bind(v.lenis);
  v.lenis.scrollTo = (target, options = {}) => {
    if (options.programmatic !== false) {
      window.__prog.push({
        t: performance.now(),
        target: typeof target === "number" ? Math.round(target) : String(target),
        immediate: !!options.immediate,
        duration: options.duration ?? null,
      });
    }
    return orig(target, options);
  };
  window.__startSample = () => {
    window.__samples = [];
    window.__sampling = true;
    const st6 = v.ScrollTrigger.getAll().find(
      (st) => st.vars.pin && st.trigger.closest("section.screen")?.id === "s06"
    );
    const tick = () => {
      if (!window.__sampling) return;
      window.__samples.push({
        t: Math.round(performance.now()),
        y: Math.round(v.lenis.scroll * 10) / 10,
        p: st6 ? Math.round(st6.progress * 1000) / 1000 : -1,
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  window.__stopSample = () => {
    window.__sampling = false;
    return window.__samples;
  };
});

async function runCase(name, wheelPlan) {
  // park exactly on the s05 boundary first (native — doesn't arm magnet)
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(geo.secs.s05));
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    window.__prog.length = 0;
    window.__startSample();
  });
  await page.mouse.move(960, 540);
  for (const [delta, gap] of wheelPlan) {
    await page.mouse.wheel(0, delta);
    if (gap) await page.waitForTimeout(gap);
  }
  // watch the settle for 6s
  await page.waitForTimeout(6000);
  const { samples, prog } = await page.evaluate(() => ({
    samples: window.__stopSample(),
    prog: window.__prog.slice(),
  }));
  // analysis: after input ends, find direction reversals / discontinuities
  const t0 = samples[0].t;
  let maxStepDown = 0, maxStepUp = 0, reversals = 0, prevDy = 0;
  for (let i = 1; i < samples.length; i++) {
    const dy = samples[i].y - samples[i - 1].y;
    if (dy > maxStepUp) maxStepUp = dy;
    if (dy < maxStepDown) maxStepDown = dy;
    if (Math.abs(dy) > 0.5 && Math.abs(prevDy) > 0.5 && Math.sign(dy) !== Math.sign(prevDy))
      reversals++;
    if (Math.abs(dy) > 0.5) prevDy = dy;
  }
  const final = samples[samples.length - 1];
  // wobble in last 2s
  const tail = samples.filter((s) => s.t > final.t - 2000);
  const wobble = Math.max(...tail.map((s) => Math.abs(s.y - final.y)));
  console.log(`\n=== ${name} ===`);
  console.log(
    `final y=${final.y} (s06 top=${geo.secs.s06})  pinProgress=${final.p}  ` +
    `maxStep +${maxStepUp.toFixed(1)}/-${Math.abs(maxStepDown).toFixed(1)} px/frame  reversals=${reversals}  tailWobble=${wobble.toFixed(2)}`
  );
  console.log("programmatic scrollTo calls:", JSON.stringify(prog.map((p) => ({ t: Math.round(p.t - t0), target: p.target, imm: p.immediate, dur: p.duration }))));
  // print a condensed trace: every sample where |dy|>0.3, plus 10-sample stride
  const rows = [];
  for (let i = 1; i < samples.length; i++) {
    const dy = samples[i].y - samples[i - 1].y;
    if (Math.abs(dy) > 8 || i % 30 === 0)
      rows.push(`t=${samples[i].t - t0} y=${samples[i].y} dy=${dy.toFixed(1)} p=${samples[i].p}`);
  }
  console.log(rows.join("\n"));
  return { name, samples, prog, reversals, final };
}

const vhpx = 1080;
// distance s05->s06 = 1 viewport = 1080. Lenis wheelMultiplier .95.
await runCase("gentle notches (80px ticks, 160ms apart)", Array.from({ length: 15 }, () => [80, 160]));
await runCase("medium (240px ticks, 90ms apart)", Array.from({ length: 5 }, () => [240, 90]));
await runCase("flick (3x420px rapid)", [[420, 30], [420, 30], [420, 0]]);

console.log("\nconsole errors:", errors.length, errors.slice(0, 5));
await browser.close();
