// Section-magnet probe: rest the scroll at ~12 positions (via native
// pre-position + a real wheel tick so the magnet ARMS like real input),
// then assert glide-to-boundary in catch cases, stay-put otherwise, and
// no oscillation after settling.
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
  return { secs, pins, vh: innerHeight, limit: v.lenis.limit, s01gone: !document.getElementById("s01") };
});
const { secs, pins } = geo;
const vh = geo.vh;
console.log("s01 retired:", geo.s01gone);
console.log("boundaries:", JSON.stringify(secs));
console.log("pins:", JSON.stringify(pins));

const WHEEL = 80; // one wheel tick; Lenis wheelMultiplier .95 -> 76px
const cases = [
  // --- client's screenshot case: lens-shade s20 resting mid-fold ---
  { name: "s20 mid-fold below top (+0.20vh)", rest: secs.s20 + 0.2 * vh, expect: secs.s20 },
  { name: "s20 approached from s18 (-0.25vh)", rest: secs.s20 - 0.25 * vh, expect: secs.s20 },
  // --- other unpinned seams ---
  { name: "s05 seam (+0.25vh)", rest: secs.s05 + 0.25 * vh, expect: secs.s05 },
  { name: "s23 seam (+0.30vh)", rest: secs.s23 + 0.3 * vh, expect: secs.s23 },
  { name: "s11 seam after s06 pin tail (-0.20vh)", rest: secs.s11 - 0.2 * vh, expect: secs.s11 },
  // --- exact boundary: must not move ---
  { name: "s21 exact boundary", rest: secs.s21, expect: secs.s21, stay: true },
  // --- mid-section beyond catch: must not move ---
  { name: "s25 mid-section (+0.50vh)", rest: secs.s25 + 0.5 * vh, stay: true },
  // --- pins ---
  { name: "s02 pin inside first 35%vh (+0.20vh)", rest: pins.s02.start + 0.2 * vh, expect: pins.s02.start },
  { name: "s02 pin deep inside (mid-range)", rest: (pins.s02.start + pins.s02.end) / 2, stay: true },
  { name: "s22 pin deep inside (+2vh)", rest: pins.s22.start + 2 * vh, stay: true },
  { name: "s22 pin start from s21 above (-0.20vh)", rest: secs.s22 - 0.2 * vh, expect: secs.s22 },
  { name: "s16b unpin tail mid (end+0.50vh)", rest: pins.s16b.end + 0.5 * vh, stay: true },
  { name: "s16b unpin tail near s18 (end+0.75vh)", rest: pins.s16b.end + 0.75 * vh, expect: secs.s18 },
];

// --- interior pin anchors (client round 12): the s06 card plateaus are
// registered magnet targets (see src/sections/s06 CARD_ANCHOR_A/B: state-A
// plateau centre p=0.77, state-B p=0.95). Rests within the ±35%vh catch
// window of an anchor glide onto it; unanchored deep-pin rests still stay.
{
  const len = pins.s06.end - pins.s06.start;
  const at = (p) => pins.s06.start + p * len;
  cases.push(
    { name: "s06 card anchor from below (p=0.71)", rest: at(0.71), expect: at(0.77) },
    { name: "s06 card anchor from above (p=0.83)", rest: at(0.83), expect: at(0.77) },
    { name: "s06 state-B anchor (p=0.92)", rest: at(0.92), expect: at(0.95) },
    { name: "s06 mid mask-zoom no anchor (p=0.40)", rest: at(0.4), stay: true },
    { name: "s06 exact card anchor (p=0.77)", rest: at(0.77), stay: true },
  );
}

const results = [];
for (const c of cases) {
  const dir = 1; // wheel down into the rest position
  const y0 = Math.round(c.rest - WHEEL * 0.95 * dir);
  await page.evaluate((y) => window.scrollTo(0, y), y0);
  await page.waitForTimeout(400); // lenis syncs to native position
  await page.mouse.move(960, 540);
  await page.mouse.wheel(0, WHEEL * dir); // real input -> arms the magnet
  // sample the scroll for 3.2s
  const samples = await page.evaluate(
    () =>
      new Promise((res) => {
        const out = [];
        const t0 = performance.now();
        const iv = setInterval(() => {
          out.push({ t: Math.round(performance.now() - t0), y: window.__viture.lenis.scroll });
          if (performance.now() - t0 > 3200) {
            clearInterval(iv);
            res(out);
          }
        }, 100);
      })
  );
  const final = samples[samples.length - 1].y;
  const tail = samples.filter((s) => s.t > 2400);
  const wobble = Math.max(...tail.map((s) => Math.abs(s.y - final)));
  const restY = c.rest;
  let pass, detail;
  if (c.stay) {
    pass = Math.abs(final - restY) <= 6 && wobble < 1.5;
    detail = `rest=${restY.toFixed(0)} final=${final.toFixed(1)} (stay) wobble=${wobble.toFixed(2)}`;
  } else {
    pass = Math.abs(final - c.expect) <= 2 && wobble < 1.5;
    detail = `rest=${restY.toFixed(0)} final=${final.toFixed(1)} expect=${c.expect.toFixed(0)} wobble=${wobble.toFixed(2)}`;
  }
  results.push({ name: c.name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${c.name}  ${detail}`);
}

// --- pin traversal: wheel through the s03 pin, must progress past it and
// NOT be yanked back to the start ---
await page.evaluate((y) => window.scrollTo(0, y), Math.round(pins.s02.start));
await page.waitForTimeout(400);
await page.mouse.move(960, 540);
for (let i = 0; i < 14; i++) {
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(80);
}
await page.waitForTimeout(2500);
const yAfter = await page.evaluate(() => window.__viture.lenis.scroll);
const traversed = yAfter > pins.s02.start + 2 * vh;
console.log(`${traversed ? "PASS" : "FAIL"}  s02 pin traversal  y=${yAfter.toFixed(0)} (start=${pins.s02.start.toFixed(0)}, end=${pins.s02.end.toFixed(0)})`);
results.push({ name: "s02 pin traversal", pass: traversed });

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed; console errors: ${errors.length}`);
if (errors.length) console.log(errors.slice(0, 5));
await browser.close();
process.exit(failed.length || errors.length ? 1 : 0);
