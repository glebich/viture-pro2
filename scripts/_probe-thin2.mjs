// s15 thin-frames choreography probe (round 19, two-asset canvas):
// arrival → static intro once → anim forward → anim backward → ping-pong.
// Samples the DEV state handle (window.__s15thin) at ~60ms cadence to log
// {phase, idx, dir}, takes checkpoint captures, then verifies offscreen
// pause and intro-skipping re-entry.
// Usage: node scripts/_probe-thin2.mjs [--mobile] [--browser webkit|chromium]
import { chromium, webkit } from "playwright";

const args = process.argv.slice(2);
const mobile = args.includes("--mobile");
const browserName = args.includes("--browser")
  ? args[args.indexOf("--browser") + 1]
  : "chromium";
const tag = (mobile ? "m-" : "d-") + browserName;

const browser = browserName === "webkit" ? await webkit.launch() : await chromium.launch();
const page = await browser.newPage({
  viewport: mobile ? { width: 375, height: 812 } : { width: 1920, height: 1080 },
});
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));

await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
await page.waitForTimeout(3500);

const t0 = Date.now();
const state = () => page.evaluate(() => window.__s15thin?.state ?? null);
const note = async (name) => {
  const s = await state();
  console.log(`[${((Date.now() - t0) / 1000).toFixed(2)}s] ${name}`, JSON.stringify(s));
  return s;
};
const shot = (name) => page.screenshot({ path: `qa/thin2/${tag}-${name}.png` });
const goto15 = () =>
  page.evaluate(() => {
    const el = document.querySelector("#s15");
    window.__viture.lenis.scrollTo(el.getBoundingClientRect().top + window.scrollY, { immediate: true });
  });

// --- arrival: sample the full first cycle (static 1s + anim 1s fwd + 1s back) ---
await goto15();
const samples = [];
// timed captures at fixed offsets, filenames stamped with the live frame
const shotAt = new Map([
  [500, "intro-static"],
  [1500, "anim-fwd"],
  [2500, "anim-back"],
  [3500, "pingpong-fwd2"],
]);
const sampleUntil = async (ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const s = await state();
    const t = Date.now() - t0;
    if (s) samples.push({ t, ...s });
    for (const [at, name] of shotAt) {
      if (t >= at && s) {
        shotAt.delete(at);
        await shot(`t${(at / 1000).toFixed(1)}-${name}-${s.phase}${String(s.idx).padStart(2, "0")}`);
      }
    }
    await page.waitForTimeout(55);
  }
};
await sampleUntil(4200); // > static(1s) + fwd(1s) + back(1s) + next fwd start

// condensed trace: phase/dir segment boundaries with frame indices
const segs = [];
for (const s of samples) {
  const last = segs[segs.length - 1];
  if (!last || last.phase !== s.phase || last.dir !== s.dir)
    segs.push({ phase: s.phase, dir: s.dir, from: s.idx, to: s.idx, t: +(s.t / 1000).toFixed(2) });
  else last.to = s.idx;
}
console.log("cycle trace (phase dir from→to @t):");
for (const g of segs)
  console.log(`  ${g.phase} dir=${g.dir} idx ${g.from}→${g.to} @${g.t}s`);

// monotonicity check inside each observed segment
let ok = true;
let prev = null;
for (const s of samples) {
  if (prev && prev.phase === s.phase && prev.dir === s.dir) {
    const d = (s.idx - prev.idx) * (s.phase === "static" ? 1 : s.dir);
    if (d < 0) { ok = false; console.log("  NON-MONOTONIC:", JSON.stringify(prev), "→", JSON.stringify(s)); }
  }
  prev = s;
}
console.log("within-segment monotonic:", ok);

await shot("cycle-pingpong");

// --- offscreen: loop pauses ---
await page.evaluate(() => window.__viture.lenis.scrollTo(0, { immediate: true }));
await page.waitForTimeout(300);
const off1 = await note("offscreen paused?");
await page.waitForTimeout(1000);
const off2 = await note("offscreen+1s frozen?");
console.log(
  "offscreen check:",
  off1 && off2 && !off1.running && !off2.running && off1.idx === off2.idx ? "PASS" : "FAIL",
);

// --- re-entry: skips the static intro, resumes ping-pong ---
await goto15();
await page.waitForTimeout(400);
const re = await note("re-entry+0.4s");
console.log("re-entry skips intro:", re && re.phase === "anim" && re.running ? "PASS" : "FAIL");
await shot("reentry");

console.log("console errors:", errors.length ? errors : "none");
await browser.close();
