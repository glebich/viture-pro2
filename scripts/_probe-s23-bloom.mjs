// s23 gradient bloom + parallax probe.
// - timed captures of the bloom after the top-75% entry beat fires
// - parallax captures at scroll positions through the section, plus a
//   numeric edge-bleed check of the bg rect at both scrub extremes
// Usage: node scripts/_probe-s23-bloom.mjs [--mobile] [--reduced]
import { chromium } from "playwright";
import { mkdirSync } from "fs";

mkdirSync("qa/s23", { recursive: true });
const mobile = process.argv.includes("--mobile");
const reduced = process.argv.includes("--reduced");
const tag = `${mobile ? "m" : "d"}${reduced ? "-rm" : ""}`;
const vp = mobile ? { width: 375, height: 812 } : { width: 1920, height: 1080 };
const vh = vp.height;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
if (reduced) await page.emulateMedia({ reducedMotion: "reduce" });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));

const baseArg = process.argv.indexOf("--base");
const base = baseArg >= 0 ? process.argv[baseArg + 1] : "http://localhost:5173";
await page.goto(`${base}/?nosnap`, { waitUntil: "networkidle" });
await page.waitForTimeout(3500); // loader glide + fonts

// layout position of #s23 (document space, pin spacers included)
const s23Top = await page.evaluate(() => {
  const r = document.getElementById("s23").getBoundingClientRect();
  return r.top + window.scrollY;
});
console.log("s23 layout top:", Math.round(s23Top));

const bgSel = mobile ? ".stage--m .s23m-bg" : ".stage--d .s23-bg";
const readBg = () =>
  page.evaluate((sel) => {
    const bg = document.querySelector(sel);
    const img = bg.querySelector("img");
    const r = bg.getBoundingClientRect();
    const s = document.getElementById("s23").getBoundingClientRect();
    const cs = getComputedStyle(img);
    // the bg must cover the VISIBLE part of the section (section rect
    // clamped to the viewport) — that is the only band where an exposed
    // edge could ever paint
    const bandTop = Math.max(s.top, 0);
    const bandBot = Math.min(s.bottom, innerHeight);
    const covered =
      bandBot <= bandTop ||
      (r.top <= bandTop && r.bottom >= bandBot && r.left <= 0 && r.right >= innerWidth);
    return {
      rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) },
      visibleBand: [Math.round(bandTop), Math.round(bandBot)],
      covered,
      bgTransform: getComputedStyle(bg).transform,
      imgOpacity: cs.opacity,
      imgTransform: cs.transform,
    };
  }, bgSel);

// ---------- 1. timed bloom captures ----------
// park just BEFORE the entry beat (top 75% => scrollY = top - 0.75*vh),
// verify the wash is still hidden, then cross the beat and capture on a
// timed ladder.
const preY = Math.round(s23Top - 0.78 * vh);
const postY = Math.round(s23Top - 0.7 * vh);
await page.evaluate((y) => window.scrollTo(0, y), preY);
await page.waitForTimeout(700);
console.log("pre-beat state:", JSON.stringify(await readBg()));
await page.screenshot({ path: `qa/s23/bloom-${tag}-t0-pre.png` });

await page.evaluate((y) => window.scrollTo(0, y), postY);
const t0 = Date.now();
for (const ms of [400, 900, 1500, 2600]) {
  const wait = ms - (Date.now() - t0);
  if (wait > 0) await page.waitForTimeout(wait);
  await page.screenshot({ path: `qa/s23/bloom-${tag}-${String(ms).padStart(4, "0")}ms.png` });
  console.log(`t+${ms}ms:`, JSON.stringify(await readBg()));
}

// ---------- 1b. full-frame bloom ladder ----------
// fresh load, then jump straight to the section top: the once-trigger
// fires during the jump and the bloom plays with the section filling
// the frame — the clearest look at the emergence itself.
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(3500);
await page.evaluate((y) => window.scrollTo(0, Math.round(y)), s23Top);
const tf = Date.now();
for (const ms of [150, 500, 1000, 1600, 2600]) {
  const wait = ms - (Date.now() - tf);
  if (wait > 0) await page.waitForTimeout(wait);
  await page.screenshot({ path: `qa/s23/bloomfull-${tag}-${String(ms).padStart(4, "0")}ms.png` });
  console.log(`full t+${ms}ms:`, JSON.stringify(await readBg()));
}

// ---------- 2. parallax captures through the section ----------
// bloom is settled now; step the section through the viewport and let
// the scrub (0.6) converge at each stop.
const stops = [
  ["enter", s23Top - vh * 0.85],
  ["quarter", s23Top - vh * 0.5],
  ["rest", s23Top],
  ["threeq", s23Top + vh * 0.5],
  ["exit", s23Top + vh * 0.85],
];
for (const [name, y] of stops) {
  await page.evaluate((yy) => window.scrollTo(0, Math.round(yy)), y);
  await page.waitForTimeout(1200); // scrub 0.6 converges
  const st = await readBg();
  console.log(`parallax ${name} (y=${Math.round(y)}):`, JSON.stringify(st));
  console.log(`  covers visible band: ${st.covered}`);
  await page.screenshot({ path: `qa/s23/parallax-${tag}-${name}.png` });
}

// ---------- 3. settled rest state ----------
await page.evaluate((y) => window.scrollTo(0, y), Math.round(s23Top));
await page.waitForTimeout(1500);
console.log("rest state:", JSON.stringify(await readBg()));
await page.screenshot({ path: `qa/s23/rest-${tag}.png` });

console.log("console errors:", errors.length ? errors : "none");
await browser.close();
