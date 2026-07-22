// Sweep the real-page s22 approach + early pin: full-page shots every step.
// Usage: node sweep22.mjs [--w 1920 --h 1080] [--from -1.0 --to 0.35 --step 0.05] [--prefix sweep]
import { chromium } from "playwright";

const args = process.argv.slice(2);
const get = (f, d) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : d;
};
const W = Number(get("--w", 1920));
const H = Number(get("--h", 1080));
const from = Number(get("--from", -1)); // in viewports relative to pin start (negative = approach)
const to = Number(get("--to", 0.35)); // in pin-progress units when >= 0
const step = Number(get("--step", 0.05));
const prefix = get("--prefix", "sweep");
const outdir = get("--outdir", "qa");
const base = get("--base", "http://localhost:5173");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto(base + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
// let s01 loader glide + retire
await page.waitForTimeout(5000);

const info = await page.evaluate(() => {
  const v = window.__viture;
  const sts = v.ScrollTrigger.getAll().filter((st) => {
    const t = st.trigger;
    return t instanceof Element && t.id === "s22" && st.vars.pin;
  });
  const st = sts[0];
  if (st)
    return { start: st.start, end: st.end, limit: v.lenis.limit, vh: window.innerHeight };
  // mobile: no pin — "start" is the section resting fullscreen
  const el = document.getElementById("s22");
  const top = el.getBoundingClientRect().top + window.scrollY;
  return { start: top, end: top + window.innerHeight, limit: v.lenis.limit, vh: window.innerHeight };
});
console.log("pin", info);

const shots = [];
for (let u = from; u <= to + 1e-9; u += step) {
  // u < 0: approach measured in viewports before pin start; u >= 0: pin progress
  const y = u < 0 ? info.start + u * info.vh : info.start + u * (info.end - info.start);
  if (y < 0) continue;
  shots.push({ u: Math.round(u * 1000) / 1000, y: Math.round(y) });
}
for (const s of shots) {
  await page.evaluate((yy) => {
    const v = window.__viture;
    v.lenis.scrollTo(yy, { immediate: true, force: true });
  }, s.y);
  await page.waitForTimeout(1300); // settle: scrub catch-up + entrance play-out
  const tag = (s.u < 0 ? "m" : "p") + String(Math.abs(s.u)).replace(".", "_");
  await page.screenshot({ path: `${outdir}/${prefix}-${tag}.png` });
  console.log("wrote", `${outdir}/${prefix}-${tag}.png`, "y=", s.y);
}
await browser.close();
