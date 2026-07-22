import "./style.css";
import type { Section } from "../../lib/section";
import { mountLazyVideo } from "../../lib/lazyvideo";
import { registerPinSnapAnchors } from "../../lib/snap";

/* ⚠ REGRESSION GUARD: run `node scripts/assert-s06-card.mjs` after ANY edit
 * to this file. It sweeps the card beats in chromium AND webkit (harness +
 * full-page) and asserts the UltraClarity card actually shows content.
 * The card content has gone blank THREE times — the root cause was only
 * found on round 4 (see the "Safari culler snapshot" comment at the card
 * morph below); the guard exists so it can never regress silently.
 *
 * s06 — merged pinned sequence (former s06 + s07 + s08):
 *   1. wordmark read-out travel (VITURE … Pro 2 slides right-to-left)
 *   2. mask-zoom reveal — the letters are a MASK over a screen-locked copy
 *      of the scene; the mask scales up ~16x toward a letter stroke near the
 *      viewport centre so the camera pushes THROUGH the letters into the
 *      full-bleed photo (former s07)
 *   3. the UltraClarity glass card rises from the bottom over the SAME photo
 *   4. card morph state a -> b (specs -> SONY's Micro OLED, former s08)
 */

const AD = "/assets/1920_Screen-06-01";
const AM = "/assets/375_Screen-06-01";
const PD = "/assets/1920_Screen-07-01"; // shared full-bleed photo
const PM = "/assets/375_Screen-07-01";
const BD = "/assets/1920_Screen-08-01b"; // card morph state-b background
const BM = "/assets/375_Screen-08-01b";
const CD = "/assets/1920_Screen-08-01a"; // card spec-divider dot
const CM = "/assets/375_Screen-08-01a";

const WORDMARK = "VITURE Pro 2";

// ---------------------------------------------------------------------------
// Magnet geometry (client round 12 — the s05->s06 "strange jump" fix + the
// card readability anchors). All values are fractions of the pinned scroll
// length == scrubbed-timeline progress (the spacer tween pins duration at 1).
//
// OPEN_PLATEAU: the wordmark travel used to start at p=0, so ANY arrival
// overshoot past the pin start (Lenis lerp always carries the wheel target
// 50-380px in) made the letters travel forward, rest, then visibly slide
// BACK when snap.ts's pin-start catch (first 35%vh of the pin) glided the
// scroll home — the client's "strange jump after COMFORT". 0.07 of the
// 5-viewport pin is exactly that 35%vh catch window, so every catch-window
// rest now lands INSIDE a motionless opening plateau: the pull-back glide
// still runs, but it is visually a no-op — the wordmark just sits and
// waits. Travel still completes at 0.28; zoom and every later beat are
// untouched.
//
// CARD_ANCHOR_A/B: interior snap anchors (registered with lib/snap below).
// A = the state-A "UltraClarity 3.0 Is Here" plateau centre — card rise
// ends at 0.62 + 0.14 = 0.76, the morph roll starts at 0.78 -> 0.77.
// B = the state-B rest plateau centre — morph done by 0.90, pin ends at
// 1.0 -> 0.95. Rests within ±35%vh of an anchor glide onto it so fast
// scrollers still get parked on a readable card.
// ---------------------------------------------------------------------------
const OPEN_PLATEAU = 0.07;
const CARD_ANCHOR_A = 0.77;
const CARD_ANCHOR_B = 0.95;

/** Glass card shared by both states. Badge persists; the content blocks
 *  roll vertically through the clipped .s06-cbody window (a out, b in). */
const card = (dot: string) => `
  <div class="s06-card">
    <div class="s06-badge">PRO 2</div>
    <div class="s06-cbody">
      <div class="s06-ca">
        <div class="s06-ctext">
          <h3 class="s06-h">UltraClarity <span class="s06-h-semi">3.0</span><br>Is Here</h3>
          <p class="s06-sub">Sharper where it counts.</p>
        </div>
        <div class="s06-specs">
          <span class="s06-spec-big">50&deg;</span>
          <img class="s06-cdot" src="${dot}" alt="">
          <span class="s06-specgrp">
            <span class="s06-spec-big">1600</span>
            <span class="s06-spec-unit">Nits</span>
          </span>
        </div>
        <div class="s06-cline"></div>
        <div class="s06-cinfo">
          <span class="s06-price">$299</span>
          <button class="s06-btn" type="button">Learn More</button>
        </div>
      </div>
      <div class="s06-cb"><h3 class="s06-h">SONY's Micro OLED</h3></div>
    </div>
  </div>`;

const stageHtml = (bp: "d" | "m") => {
  const bgSvg =
    bp === "d" ? `${AD}/img1920Screen0601.baked.webp` : `${AM}/img375Screen0601.baked.webp`;
  const tex = (bp === "d" ? AD : AM) + "/imgViturePro2.webp";
  // the SAME scene markup is used twice: once as the reveal target photo
  // (.s06-photo) and once screen-locked inside the mask — zero seam.
  const scene =
    bp === "d"
      ? `<img src="${PD}/img1920Screen0701.webp" alt="">`
      : `<div class="s06-pclip"><img src="${PM}/imgHeroStill000000021.webp" alt=""></div>`;
  const bgb = bp === "d" ? `${BD}/img1920Screen0801.webp` : `${BM}/img375Screen0801.webp`;
  const dot = (bp === "d" ? CD : CM) + "/imgEllipse1329130646.svg";
  // the SAME live main-screen loop is used twice (round 15): once full-bleed
  // behind the mask (.s06-vid — the post-handoff surface) and once
  // screen-locked INSIDE the mask (.s06-mvid) so the loop is already playing
  // through the letters during travel+zoom and the handoff has zero jump.
  // preload="none" (perf round): with "metadata" Chrome opportunistically
  // buffered the ENTIRE 1.9MB loop ×2 at page load, five viewports early —
  // lib/lazyvideo upgrades to preload="auto"+load() one viewport out, so
  // the loop is still warm before the pin can possibly show it.
  const vid = (cls: string) => `<div class="${cls}"><video
        muted
        loop
        playsinline
        preload="none"
        poster="/video/main-poster.jpg"
        src="/video/main-screen.mp4"
        aria-hidden="true"
      ></video></div>`;
  return `
  <div class="s06-bg s06-bg--${bp}"><img src="${bgSvg}" alt=""></div>
  <div class="s06-dim s06-dim--out"></div>
  <div class="s06-scene s06-scene--${bp} s06-photo">${scene}</div>
  ${vid("s06-vid")}
  <div class="s06-maskenter">
    <div class="s06-maskwrap">
      <div class="s06-maskinner">
        <div class="s06-scene s06-scene--${bp}">${scene}</div>
        <img class="s06-tex" src="${tex}" alt="">
        ${vid("s06-mvid")}
      </div>
    </div>
  </div>
  <div class="s06-bgb"><img src="${bgb}" alt=""><div class="s06-shade"></div></div>
  <div class="s06-dim s06-dim--in"></div>
  ${card(dot)}
`;
};

const html = `
<div class="stage stage--d">${stageHtml("d")}</div>
<div class="stage stage--m">${stageHtml("m")}</div>
`;

interface Cfg {
  sel: string;
  w: number;
  h: number;
  /** wordmark font-size in stage px */
  font: number;
  /** wordmark right edge in stage px before the xPercent shifts */
  rightEdge: number;
  /** xPercent/100 at travel start / end (from the original s06 layout) */
  startShift: number;
  endShift: number;
  zoomMax: number;
  end: string;
  cardTop: number;
  mobile: boolean;
}

const DESKTOP: Cfg = {
  sel: ".stage--d",
  w: 1920,
  h: 1080,
  font: 400,
  rightEdge: 1920 - 346.5,
  startShift: 0.5,
  endShift: -0.05,
  zoomMax: 16,
  end: "+=500%",
  cardTop: 224,
  mobile: false,
};

const MOBILE: Cfg = {
  sel: ".stage--m",
  w: 375,
  h: 812,
  font: 240,
  rightEdge: 375 + 373.5,
  startShift: 0.5,
  endShift: -0.3,
  zoomMax: 12,
  end: "+=450%",
  cardTop: 299.5,
  mobile: true,
};

/** Render the wordmark to a canvas used as the CSS mask bitmap. Supersampled
 *  (device-pixel-aware, 3-4x, clamped to ~8k on the long axis) so the glyph
 *  edges stay crisp under the 16x deep-zoom beats. Returns geometry in
 *  stage px. */
function makeMask(font: number) {
  const pad = Math.round(font * 0.25);
  const c = document.createElement("canvas");
  let g = c.getContext("2d")!;
  // measure at 1x first so the supersample factor can be clamped to the
  // memory-sane 8k bitmap budget before the real raster
  g.font = `400 ${font}px "Season Sans", sans-serif`;
  const w = g.measureText(WORDMARK).width;
  const want = Math.min(4, Math.max(3, Math.ceil(window.devicePixelRatio) * 2));
  const R = Math.max(2, Math.min(want, 8192 / (w + pad * 2)));
  const fontStr = `400 ${font * R}px "Season Sans", sans-serif`;
  c.width = Math.ceil((w + pad * 2) * R);
  c.height = Math.ceil((font + pad * 2) * R);
  g = c.getContext("2d")!; // resize resets state
  g.font = fontStr;
  g.fillStyle = "#fff";
  const m = g.measureText(WORDMARK);
  // centre the visual glyph box on the canvas middle row — matches the old
  // DOM title (line-height:1 box vertically centred on the stage)
  const glyphMid = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  g.fillText(WORDMARK, pad * R, c.height / 2 + glyphMid);
  return { canvas: c, ctx2d: g, w, pad, R };
}

export const s06: Section = {
  id: "s06",
  html,
  init(el, ctx) {
    // card-plateau magnet anchors (see the constants block above) — plain
    // data registration; snap.ts resolves absolute positions per refresh
    // from the live pin, so this is valid even though the pin builds late
    registerPinSnapAnchors("s06", [CARD_ANCHOR_A, CARD_ANCHOR_B]);
    mountLazyVideo(el, ctx);
    // keep the in-mask loop frame-locked to the full-bleed loop (round 15):
    // both start on the same lazyvideo tick so they're already near-sync;
    // snap currentTime whenever either (re)starts and the drift is visible.
    for (const stage of el.querySelectorAll<HTMLElement>(".stage")) {
      const main = stage.querySelector<HTMLVideoElement>(".s06-vid video");
      const mask = stage.querySelector<HTMLVideoElement>(".s06-mvid video");
      if (!main || !mask) continue;
      const sync = () => {
        if (
          mask.readyState >= 1 &&
          Math.abs(mask.currentTime - main.currentTime) > 0.1
        )
          mask.currentTime = main.currentTime;
      };
      main.addEventListener("playing", sync);
      mask.addEventListener("playing", sync);
    }
    const { gsap, ScrollTrigger } = ctx;
    const mm = gsap.matchMedia();

    // QA harness freezes scrubbed timelines at a fixed progress; entrance
    // from-states would then stick, so skip them in that mode (cf. s10).
    // Our pinned timeline is created AFTER the font loads — too late for
    // main.ts's freeze pass — so we re-apply the freeze ourselves below.
    const qaProgress = import.meta.env.DEV
      ? parseFloat(new URLSearchParams(location.search).get("progress") ?? "")
      : NaN;
    const qaFixed = !Number.isNaN(qaProgress);

    const build = (cfg: Cfg) => (mmCtx: gsap.Context) => {
      const stage = el.querySelector<HTMLElement>(cfg.sel)!;
      const q = (s: string) => stage.querySelector<HTMLElement>(s)!;
      const bgImg = q(".s06-bg img");
      const dimIn = q(".s06-dim--in");
      const dimOut = q(".s06-dim--out");
      const photo = q(".s06-photo");
      const enter = q(".s06-maskenter");
      const wrap = q(".s06-maskwrap");
      const inner = q(".s06-maskinner");
      const tex = q(".s06-tex");
      const bgb = q(".s06-bgb");
      const cardEl = q(".s06-card");
      const ca = q(".s06-ca");
      const cb = q(".s06-cb");

      let cancelled = false;

      (async () => {
        // glyph shapes and card metrics both need the real font
        try {
          await document.fonts.load(`400 ${cfg.font}px "Season Sans"`);
        } catch {
          /* fall through — mask still drawn with fallback metrics */
        }
        if (cancelled) return;

        mmCtx.add(() => {
          // ---------- mask geometry ----------
          const { canvas, ctx2d, w, pad, R } = makeMask(cfg.font);
          const topY = cfg.h / 2 - cfg.font / 2;
          const baseLeft = cfg.rightEdge - w;
          const left0 = baseLeft + cfg.startShift * w; // travel start
          const left1 = baseLeft + cfg.endShift * w; // travel end
          const TX = left1 - left0;

          const url = canvas.toDataURL();
          const ws = wrap.style;
          ws.maskImage = ws.webkitMaskImage = `url(${url})`;
          ws.maskRepeat = ws.webkitMaskRepeat = "no-repeat";
          ws.maskSize = ws.webkitMaskSize = `${w + pad * 2}px ${cfg.font + pad * 2}px`;
          ws.maskPosition = ws.webkitMaskPosition = `${left0 - pad}px ${topY - pad}px`;
          // mask-clip is border-box: the wrap box must contain the whole mask
          // bitmap or letters past the stage edge are clipped away
          ws.width = `${Math.ceil(left0 + w + pad)}px`;
          ws.visibility = "visible";

          // ---------- zoom focal point ----------
          // aim at the stage centre at end-of-travel, then snap to the
          // nearest solid letter stroke so the push goes THROUGH ink
          const img = ctx2d.getImageData(0, 0, canvas.width, canvas.height).data;
          const alpha = (x: number, y: number) => {
            const xi = Math.round(x);
            const yi = Math.round(y);
            if (xi < 0 || yi < 0 || xi >= canvas.width || yi >= canvas.height)
              return 0;
            return img[(yi * canvas.width + xi) * 4 + 3];
          };
          const probe = cfg.font * 0.03 * R;
          const solid = (x: number, y: number) =>
            alpha(x, y) > 250 &&
            alpha(x - probe, y) > 250 &&
            alpha(x + probe, y) > 250 &&
            alpha(x, y - probe) > 250 &&
            alpha(x, y + probe) > 250;
          const tX = (cfg.w / 2 - left1 + pad) * R;
          const tY = (cfg.h / 2 - topY + pad) * R;
          let fx = tX;
          let fy = tY;
          if (!solid(fx, fy)) {
            outer: for (let r = 6; r < cfg.font * R; r += 6) {
              const steps = Math.max(8, Math.round((2 * Math.PI * r) / 8));
              for (let i = 0; i < steps; i++) {
                const a = (i / steps) * 2 * Math.PI;
                const x = tX + r * Math.cos(a);
                const y = tY + r * Math.sin(a);
                if (solid(x, y)) {
                  fx = x;
                  fy = y;
                  break outer;
                }
              }
            }
          }
          // maskwrap local coords (wrap is translated by TX at zoom time)
          const focalX = fx / R - pad + left1 - TX;
          const focalY = fy / R - pad + topY;
          gsap.set([wrap, inner], {
            transformOrigin: `${focalX}px ${focalY}px`,
          });

          // wrap scales the mask; inner counter-scales so the scene stays
          // screen-locked — the camera pushes through, the world stands still
          const setWrap = (tx: number, z: number) => {
            gsap.set(wrap, { x: tx, scale: z });
            gsap.set(inner, { x: -tx / z, scale: 1 / z });
          };
          const travel = { p: 0 };
          const zoom = { p: 0 };
          const applyTravel = () =>
            setWrap(TX * travel.p, 1 + 0.06 * travel.p);
          const K = cfg.zoomMax / 1.06;
          const applyZoom = () => setWrap(TX, 1.06 * Math.pow(K, zoom.p));
          setWrap(0, 1);

          // ---------- card ----------
          // mobile card is vertically centred on its design `top`; gsap owns
          // the transform so the height tween keeps the card centred
          if (cfg.mobile) gsap.set(cardEl, { yPercent: -50 });
          const hA = cardEl.offsetHeight;
          const aH = ca.offsetHeight;
          const hB = hA - aH + cb.offsetHeight;
          const rise = cfg.mobile
            ? cfg.h - cfg.cardTop + hA / 2 + 40
            : cfg.h - cfg.cardTop + 40;
          gsap.set(cardEl, { y: rise });
          // roll geometry (round 9): .s06-cbody is an overflow-hidden window
          // (PAD = its padding-top, so cap-trim ink never clips at rest).
          // a rolls up and out of it while b rolls up into it — the blocks
          // stay geometrically disjoint at every scrub position.
          const PAD = cfg.mobile ? 8 : 12;
          const rollOut = -(aH + PAD + 6); // a fully above the clip top
          const rollIn = aH + (cfg.mobile ? 24 : 40); // b parked below a
          gsap.set(cb, { y: rollIn }); // parked from t0 — never at y:0 early

          // ---------- roll driver (round 12 — the Safari empty-card fix) ---
          // The a->b morph state is ONE scalar. It used to be four separate
          // tweens (a.y, b.y, a.visibility, b.visibility) — and the two
          // visibility fromTo()s were the root cause of the thrice-regressed
          // "empty card" bug, Safari-only: ScrollTrigger.refresh() force-
          // renders scrubbed timelines end->back and finally rewinds each
          // fromTo to the element's PRE-TWEEN COMPUTED value recorded at
          // first render (gsap `_rewindStartAt`). On WebKit the offscreen
          // culler in main.ts has `#s06 { visibility: hidden }` at that
          // moment (s06 sits viewports below the load position), so gsap
          // recorded "hidden" and parked `visibility: hidden` INLINE on
          // .s06-ca — content A invisible from card-rise all the way to the
          // 0.85 clamp. Chrome has no culler, so it recorded "visible" and
          // never showed the bug; the ?only= QA harness disables the culler,
          // so static snaps could never reproduce it either.
          // Fix: never let gsap own `visibility` here. One proxy tween
          // drives both blocks; y goes through gsap.set (transform cache
          // stays coherent) and visibility is a plain style write — a pure
          // function of roll.p, so any refresh dance ends in the correct
          // state and there is nothing for gsap to snapshot or rewind.
          // Beat semantics preserved exactly (round 11): roll 0.78->0.84,
          // b hidden only while parked below the clip window, a hidden only
          // once fully rolled out above it — the clamps stay strictly
          // outside the roll, and the blocks can never desync because they
          // share one driver.
          const roll = { p: 0 };
          const applyRoll = () => {
            const p = roll.p;
            gsap.set(ca, { y: rollOut * p });
            gsap.set(cb, { y: rollIn * (1 - p) });
            // "inherit" (never "visible") so the stage-level offscreen
            // guards are never overridden
            ca.style.visibility = p >= 1 ? "hidden" : "inherit";
            cb.style.visibility = p <= 0 ? "hidden" : "inherit";
          };

          // ---------- entrance ----------
          if (!qaFixed) {
            gsap
              .timeline({ scrollTrigger: { trigger: el, start: "top 78%" } })
              // NOTE: never tween the bg svg's own opacity — its internal
              // blend modes re-isolate under a container alpha in Chromium
              // and it flashes purple. Fade a black dim layer instead.
              .fromTo(
                dimIn,
                { opacity: 1 },
                { opacity: 0, duration: 0.9, ease: "power2.out" },
                0,
              )
              .fromTo(
                enter,
                { opacity: 0, y: 44 },
                { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" },
                0.08,
              );
          }

          // ---------- pinned scrub: travel -> mask-zoom -> card -> morph ----
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: el,
              start: "top top",
              end: cfg.end,
              pin: true,
              scrub: 0.6,
              // Every ScrollTrigger.refresh() force-renders this scrubbed
              // timeline end->back. The wrap transform is driven by PROXY
              // tweens (travel/zoom -> setWrap), and the refresh rewind
              // writes proxy values back WITHOUT firing onUpdate — so with
              // the scroll resting at/above the pin start the wrap kept the
              // end-render's travel-END transform until the first positive
              // progress snapped it home: the s05->s06 fold entrance showed
              // the wordmark at the read-out END position, then it POPPED
              // ~1240px to its opening rest as the pin engaged (part of the
              // client's "jump after COMFORT"). Elements heal themselves
              // (gsap rewinds their recorded start values directly); only
              // the proxy-driven wrap needs this: re-assert the pure
              // opening state whenever a refresh ends at the pin top.
              onRefresh: (self: ScrollTrigger) => {
                if (self.progress <= 0) {
                  travel.p = 0;
                  applyTravel();
                }
              },
            },
            defaults: { ease: "none", immediateRender: false },
          });
          // opening plateau via EASE, not tween position: the travel tween
          // must keep spanning [0, 0.28] so some active tween owns the wrap
          // transform at EVERY progress in that range — ScrollTrigger's
          // refresh force-renders this scrubbed timeline end->back, and a
          // tween that hasn't started yet (immediateRender: false) leaves
          // the end-render's wx=TX/scale=1.06 leftovers on the DOM (the
          // same leftover class as the round-12 card bug). A clamped-linear
          // ease holds p at 0 through the plateau and then runs the exact
          // linear travel of old — every render at progress 0 re-applies
          // the true opening state.
          const PLATEAU_T = OPEN_PLATEAU / 0.28; // plateau as tween fraction
          const plateauEase = (t: number) =>
            t <= PLATEAU_T ? 0 : (t - PLATEAU_T) / (1 - PLATEAU_T);
          tl
            // 1. wordmark read-out travel; scene locked behind the letters.
            //    Motionless through p 0..OPEN_PLATEAU (see the constants
            //    block) so the snap magnet's pin-start catch settles
            //    arrivals with zero visible motion.
            .fromTo(
              travel,
              { p: 0 },
              {
                p: 1,
                duration: 0.28,
                ease: plateauEase,
                onUpdate: applyTravel,
              },
              0,
            )
            .fromTo(
              bgImg,
              { scale: 1 },
              {
                scale: 1.06,
                duration: 0.28,
                ease: plateauEase,
                transformOrigin: "50% 50%",
              },
              0,
            )
            // 2. push through the letters — glow bg falls to black; the
            //    letters already show the LIVE loop (.s06-mvid, round 15);
            //    the same loop + photo fallback bloom in behind as the
            //    expanding letters merge into the full scene. tex fade is the
            //    reduced-motion/slow-network fallback path (texture->scene)
            //    — with the loop playing the mvid layer covers it.
            .fromTo(
              zoom,
              { p: 0 },
              { p: 1, duration: 0.3, onUpdate: applyZoom },
              0.28,
            )
            .fromTo(dimOut, { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.28)
            .fromTo(tex, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.1 }, 0.32)
            .fromTo(photo, { opacity: 0 }, { opacity: 1, duration: 0.14 }, 0.4)
            // the full-bleed loop blooms in WITH the photo (round 15: it was
            // 0.56, i.e. after the mask retired — visible static->live jump).
            // From here both sides of the mask are the same playing video.
            .fromTo(q(".s06-vid"), { opacity: 0 }, { opacity: 1, duration: 0.14, immediateRender: false }, 0.4)
            // by now every pixel above and below the mask layer is the same
            // live loop — this fade is invisible, it just retires the mask
            // layer. autoAlpha (not opacity): the wrap is a giant 16x-scaled
            // masked layer; visibility:hidden takes it off the compositor
            // entirely so nothing can ghost over the photo from here to p1
            .fromTo(wrap, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.03 }, 0.55)
            // 3. the glass card rises into the same photo page
            .fromTo(cardEl, { y: rise }, { y: 0, duration: 0.14 }, 0.62)
            // 4. card morph a -> b as a clipped vertical roll (round 10):
            //    .s06-cbody overflow-hidden clips; a translates up and out
            //    of the window while b translates up into it over the SAME
            //    window (identical timing + ease, so their gap stays
            //    positive for the whole roll) — the two blocks occupy
            //    disjoint visible regions at every scrub position: never
            //    blank, never double-exposed. Visibility clamps sit strictly
            //    OUTSIDE the roll (b hidden only while parked below; a
            //    hidden only once fully out) so no stale compositor layer
            //    under the backdrop-filter can paint a second copy. Since
            //    round 12 y + visibility both live in applyRoll (single
            //    driver, plain-style visibility writes — see the roll-driver
            //    comment for the Safari culler/rewind bug that forced this).
            //    TIMING (round 11): the round-10 morph ran 0.8->1.0, so ANY
            //    rest inside 0.87-1.0 parked the user on a half-collapsed
            //    card ("SONY's" glued to the card's bottom edge). The whole
            //    morph now COMPLETES by 0.90 — same relative sequencing,
            //    just compressed — leaving 0.90-1.0 as a true rest plateau
            //    at the final compact Screen-08-01b state.
            .fromTo(bgb, { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.78)
            // bgb is opaque from 0.82 — retire the glasses photo underneath
            // so nothing can double-expose through later beats; restored on
            // scrub-back while still covered (bgb stays 1 until 0.82).
            // Plain `opacity`, NOT autoAlpha: photo's base opacity is 0, so
            // the autoAlpha rewind (see the roll-driver comment) recorded
            // visibility:hidden and parked it inline — the fallback photo
            // was dead in Safari for the whole reveal. An opacity-0 layer
            // never paints, so the compositor-retire intent is unchanged.
            .fromTo(
              photo,
              { opacity: 1 },
              { opacity: 0, duration: 0.01 },
              0.83,
            )
            // a rolls out while b rolls in — single driver, see applyRoll
            .fromTo(
              roll,
              { p: 0 },
              { p: 1, duration: 0.06, ease: "power1.inOut", onUpdate: applyRoll },
              0.78,
            )
            // height collapse AFTER the roll has mostly landed: while it
            // overlapped the roll, the shrinking card bottom cropped b
            // mid-glyph ("SONY's" peeking at the card edge). At its 0.83
            // start the roll (power1.inOut) is ~94% landed, and the card
            // bottom stays below b's landing box for the whole overlap, so
            // b is never cropped. Ends at exactly 0.90 — the last real beat.
            .fromTo(
              cardEl,
              { height: hA },
              { height: hB, duration: 0.07 },
              0.83,
            )
            // rest-plateau spacer: an inert tween ending at exactly 1.0 pins
            // the timeline's total duration at 1 (labels == scroll progress).
            // Without it GSAP would rescale — the height tween used to be the
            // duration guard when it ended at 1.0; this replaces that role.
            .to({}, { duration: 0.1 }, 0.9);
          if (cfg.mobile)
            tl.fromTo(
              cardEl,
              { top: 299.5 },
              { top: 199.5, duration: 0.07 },
              0.83,
            );
        });

        ScrollTrigger.refresh();

        // late-created scrubbed timeline: re-apply the QA freeze main.ts
        // already ran for everything else
        if (qaFixed) {
          requestAnimationFrame(() => {
            ScrollTrigger.getAll().forEach((st) => {
              if (!st.vars.scrub) return;
              const trg = st.trigger as Element | null;
              if (!trg || !el.contains(trg)) return;
              st.disable(false);
              st.animation?.progress(qaProgress).pause();
            });
          });
        }
      })();

      return () => {
        cancelled = true;
      };
    };

    mm.add("(min-width: 641px)", build(DESKTOP));
    mm.add("(max-width: 640px)", build(MOBILE));
  },
};
