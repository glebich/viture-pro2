// Regression guard for the s06 UltraClarity card — run after ANY edit to
// src/sections/s06/index.ts (see the warning at the top of that file).
//
// The card content went blank three times before the root cause was found:
// gsap fromTo() tweens on visibility/autoAlpha get force-rendered end->back
// by every ScrollTrigger.refresh() and finally REWOUND to the element's
// pre-tween computed value recorded at first render. On WebKit the
// offscreen culler (main.ts, Safari-only) has `#s06 { visibility: hidden }`
// at build time, so gsap recorded "hidden" and parked it inline on
// .s06-ca — badge-only card through the whole rise/rest beat, SAFARI ONLY.
//
// Because the ?only= harness disables the culler, a harness sweep alone can
// NEVER catch that class of bug. This guard therefore runs three stages:
//   1. chromium harness sweep   ?only=s06&progress=p   (fast, per-beat)
//   2. webkit  harness sweep    ?only=s06&progress=p
//   3. webkit  FULL-PAGE scroll to the same beats — culler + lenis + late
//      s06 build active: the only mode that reproduces the Safari bug.
// Note: Playwright's headless WebKit does not render backdrop-filter (the
// glass frost is absent there regardless) — a known broken oracle. All
// assertions are therefore about TEXT content: DOM computed state plus
// text-ink pixel presence (screenshot diff with card content force-hidden),
// never about the frost.
//
// Usage: node scripts/assert-s06-card.mjs   (dev server on :5173)
import { chromium, webkit } from "playwright";
import sharp from "sharp";

const BASE = process.env.BASE ?? "http://localhost:5173";
const PS = [0.65, 0.7, 0.75, 0.78, 0.86, 0.92, 1.0];
const failures = [];

/** DOM truth: which content block (a / b) is actually visible inside the
 *  clipped .s06-cbody window of the desktop card. */
const domState = (page) =>
  page.evaluate(() => {
    const stage = document.querySelector("#s06 .stage--d");
    const card = stage.querySelector(".s06-card");
    const cbody = stage.querySelector(".s06-cbody");
    const ca = stage.querySelector(".s06-ca");
    const cb = stage.querySelector(".s06-cb");
    const cardR = card.getBoundingClientRect();
    const cbodyR = cbody.getBoundingClientRect();
    // content window = cbody clipped by the (height-animated) card; the
    // pixel window additionally clips to the viewport (mid-rise the card is
    // mostly below the fold — DOM semantics must not depend on that)
    const win = {
      left: Math.max(cbodyR.left, cardR.left),
      top: Math.max(cbodyR.top, cardR.top),
      right: Math.min(cbodyR.right, cardR.right),
      bottom: Math.min(cbodyR.bottom, cardR.bottom),
    };
    const overlapH = (r) =>
      Math.min(r.bottom, win.bottom) - Math.max(r.top, win.top);
    const visible = (el, minOverlap) => {
      const cs = getComputedStyle(el);
      return (
        cs.visibility === "visible" &&
        cs.display !== "none" &&
        parseFloat(cs.opacity) > 0.5 &&
        overlapH(el.getBoundingClientRect()) >= minOverlap
      );
    };
    const px = {
      left: Math.max(win.left, 0),
      top: Math.max(win.top, 0),
      right: Math.min(win.right, window.innerWidth),
      bottom: Math.min(win.bottom, window.innerHeight),
    };
    return {
      aVisible: visible(ca, 40),
      bVisible: visible(cb, 40),
      caInlineVis: ca.style.visibility,
      window: {
        x: Math.round(px.left),
        y: Math.round(px.top),
        w: Math.round(px.right - px.left),
        h: Math.round(px.bottom - px.top),
      },
    };
  });

/** Pixel truth: screenshot the card content window with content shown vs
 *  force-hidden and count differing pixels — nonzero ink means the text is
 *  actually painted (badge excluded: the window starts below the badge). */
async function inkPixels(page, win) {
  if (win.w < 8 || win.h < 8) return 0;
  const clip = { x: win.x, y: win.y, width: win.w, height: win.h };
  // freeze the live loops: video motion between the two shots would
  // otherwise register as ink even when the text is missing
  await page.evaluate(() => {
    document.querySelectorAll("#s06 video").forEach((v) => v.pause());
  });
  const shown = await page.screenshot({ clip });
  await page.evaluate(() => {
    for (const sel of [".s06-ca", ".s06-cb"]) {
      const el = document.querySelector(`#s06 .stage--d ${sel}`);
      el.dataset.prevVis = el.style.visibility;
      el.style.visibility = "hidden";
    }
  });
  const hidden = await page.screenshot({ clip });
  await page.evaluate(() => {
    for (const sel of [".s06-ca", ".s06-cb"]) {
      const el = document.querySelector(`#s06 .stage--d ${sel}`);
      el.style.visibility = el.dataset.prevVis ?? "";
      delete el.dataset.prevVis;
    }
    document.querySelectorAll("#s06 video").forEach((v) => {
      v.play().catch(() => {});
    });
  });
  const A = await sharp(shown).raw().toBuffer({ resolveWithObject: true });
  const B = await sharp(hidden).raw().toBuffer({ resolveWithObject: true });
  const n = Math.min(A.data.length, B.data.length);
  const ch = A.info.channels;
  let ink = 0;
  for (let i = 0; i < n; i += ch) {
    if (
      Math.abs(A.data[i] - B.data[i]) > 12 ||
      Math.abs(A.data[i + 1] - B.data[i + 1]) > 12 ||
      Math.abs(A.data[i + 2] - B.data[i + 2]) > 12
    )
      ink++;
  }
  return ink;
}

async function assertBeat(page, label, p) {
  const dom = await domState(page);
  const w = dom.window;
  // ink threshold scales with the on-screen slice: a full window shows
  // whole text blocks (thousands of ink px); a mid-rise sliver may only
  // catch part of a heading line
  const inkCheckable = w.w >= 8 && w.h >= 24;
  const minInk = w.h < 100 ? 80 : 300;
  const ink = inkCheckable ? await inkPixels(page, w) : -1;
  const contentOk =
    (dom.aVisible || dom.bVisible) && (!inkCheckable || ink >= minInk);
  const detail =
    `a=${dom.aVisible} b=${dom.bVisible} ink=${ink}px ` +
    `caInline="${dom.caInlineVis}" win=${JSON.stringify(dom.window)}`;
  if (!contentOk)
    failures.push(
      `[${label}] p=${p}: card has NO visible content (need A or B). ${detail}`,
    );
  if (p >= 0.92 && !(dom.bVisible && !dom.aVisible))
    failures.push(
      `[${label}] p=${p}: expected exactly content B (SONY's Micro OLED). ${detail}`,
    );
  console.log(`  [${label}] p=${p} ${contentOk ? "ok" : "FAIL"}  ${detail}`);
}

// ---------- stages 1+2: ?only harness sweeps (chromium, webkit) ----------
for (const [name, launcher] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  console.log(`\n=== ${name} harness sweep ===`);
  const browser = await launcher.launch();
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  for (const p of PS) {
    await page.goto(`${BASE}/?only=s06&progress=${p}`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(2500); // fonts + late s06 build + QA freeze
    await assertBeat(page, `${name}-harness`, p);
  }
  await browser.close();
}

// ---------- stage 3: webkit FULL PAGE (culler active — the Safari path) --
{
  console.log(`\n=== webkit full-page scroll ===`);
  const browser = await webkit.launch();
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(6000); // loader glide + fonts + late s06 build
  const getRange = () =>
    page.evaluate(() => {
      const st = window.__viture.ScrollTrigger.getAll().find(
        (s) => s.vars.scrub && s.trigger.closest("#s06"),
      );
      return st ? { start: st.start, end: st.end } : null;
    });
  if (!(await getRange())) {
    failures.push("[webkit-full] s06 scrubbed ScrollTrigger not found");
  } else {
    for (const p of PS) {
      // re-read the range each beat: s01 loader retirement shifts triggers
      for (let attempt = 0; attempt < 3; attempt++) {
        const r = await getRange();
        const target = r.start + p * (r.end - r.start);
        const cur = await page.evaluate(() => window.scrollY);
        const steps = 40;
        for (let i = 1; i <= steps; i++) {
          const y = cur + ((target - cur) * i) / steps;
          await page.evaluate((yy) => window.scrollTo(0, yy), y);
          await page.waitForTimeout(20);
        }
        await page.waitForTimeout(1500); // scrub 0.6 settle
        const prog = await page.evaluate(() => {
          const st = window.__viture.ScrollTrigger.getAll().find(
            (s) => s.vars.scrub && s.trigger.closest("#s06"),
          );
          return st.progress;
        });
        if (Math.abs(prog - p) < 0.01) break;
      }
      await assertBeat(page, "webkit-full", p);
    }
  }
  await browser.close();
}

if (failures.length) {
  console.error(`\nassert-s06-card: ${failures.length} FAILURE(S)`);
  for (const f of failures) console.error("  " + f);
  console.error(
    "\nThe UltraClarity card lost its content again. See the guard comment " +
      "at the top of src/sections/s06/index.ts — most likely a gsap-managed " +
      "visibility/autoAlpha tween was reintroduced on .s06-ca/.s06-cb/" +
      ".s06-photo (the Safari culler rewind bug), or the roll driver " +
      "(applyRoll) was resequenced.",
  );
  process.exit(1);
}
console.log("\nassert-s06-card: all beats OK in all three stages");
