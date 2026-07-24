import "../s02/style.css";
import "./style.css";
import type { Section } from "../../lib/section";
import { mountFrameStore } from "../../lib/frameseq";
import { prepareText, revealText } from "../../lib/textfx";
import { createLiquidGlass } from "../../lib/liquidglass";

/* Round 18 — the Five Years glasses are a SCROLL-SCRUBBED alpha frame
 * sequence (client: tied to scroll, plays backwards when scrolling back,
 * frame-smooth). 30 transparent 1920×1080 WebP frames drawn onto a canvas
 * that is BOTH the visible DOM layer in the glasses slot AND the glass
 * shader's composition layer; the pin's scrub progress maps directly to a
 * frame index, so bidirectional scrubbing and exact per-position frames
 * fall out for free. Frames preload eagerly once the section is within a
 * viewport (rect-based, cf. lazyvideo). Reduced motion: static final frame. */
const FRAME_COUNT = 30;
const frameUrl = (i: number) =>
  `/assets/fy-frames/fy-${String(i).padStart(2, "0")}.webp`;
/* scrub range of state A that carries the sequence: frames 0→29 across
 * p 0→FRAME_END; beyond, the last frame holds while the swap choreography
 * takes over (glasses fade toward the dock earlier on mobile) */
const FRAME_END_D = 0.35;
const FRAME_END_M = 0.3;
/* ---------- s03 — "Five Years" glass journey ----------
 * One pinned page merging the former s03 (glasses render) and s04 (Mobile
 * Dock render): the liquid-glass watermark travels across the screen while
 * the product behind it swaps mid-travel — glasses drift out, dock drifts
 * in — over one continuous deep-blue veil field. The pin releases by
 * dissolving the veil into s05's dark field (#080911).
 */

const A_D2 = "/assets/1920_Screen-02-01";
const A_M2 = "/assets/375_Screen-02-01";
const A_D4 = "/assets/1920_Screen-04-01";
const A_MB = "/assets/375_Screen-03-01b";
const FIVE_YEARS = "/assets/1920_Screen-03-01/Five_Years.png";
const FIVE_YEARS_SVG = "/assets/1920_Screen-03-01/Five_Years.svg";

/* Vertical background colors — round 9 (client: "same problem here", the
 * live top band read as a thin dim royal-blue strip on black). The design
 * opens on a TALL, BRIGHT ice-blue bloom — light #b8cdea at the very top
 * edge (sky light entering the frame; the fixed header sits over it and
 * keeps its own scrim for nav legibility), saturating down through
 * mid-blue and royal blue, fading through deep navy to reach the
 * near-black body by ~35% height. Then the unchanged bottom bloom to
 * bright light blue-white. Two states: glasses (bloom = bottom quarter)
 * and dock (bloom taller, ~40%). These exact stops feed BOTH the CSS
 * veils and the glass shader's refraction source, so the etch always
 * refracts what is really behind it. */
const BG_GLASSES_D: Array<[number, string]> = [
  [0.0, "#b8cdea"],
  [0.04, "#96aede"],
  [0.08, "#6e88d4"],
  [0.13, "#4560c0"],
  [0.2, "#2a3f97"],
  [0.255, "#1b2868"],
  [0.3, "#0f1531"],
  [0.35, "#0a0d16"],
  /* round 20 (client: "too blue in the bottom") — the bright blue-white
   * bloom is replaced by a subtle deep-navy glow that ends DARK, meeting
   * s05's near-black top (#080911) without a seam */
  [0.72, "#0a0d16"],
  [0.82, "#0e1526"],
  [0.92, "#16244a"],
  [1.0, "#101a33"],
];
const BG_DOCK_D: Array<[number, string]> = [
  [0.0, "#b8cdea"],
  [0.04, "#96aede"],
  [0.08, "#6e88d4"],
  [0.13, "#4560c0"],
  [0.2, "#2a3f97"],
  [0.255, "#1b2868"],
  [0.3, "#0f1531"],
  [0.35, "#0a0d16"],
  [0.58, "#0a0d16"],
  [0.7, "#101a33"],
  [0.82, "#1b2d5a"],
  [1.0, "#131f3e"],
];
const BG_GLASSES_M: Array<[number, string]> = [
  [0.0, "#b8cdea"],
  [0.035, "#96aede"],
  [0.07, "#6e88d4"],
  [0.11, "#4560c0"],
  [0.17, "#2a3f97"],
  [0.22, "#1b2868"],
  [0.26, "#0f1531"],
  [0.3, "#0a0d16"],
  [0.7, "#0a0d16"],
  [0.8, "#0e1526"],
  [0.91, "#16244a"],
  [1.0, "#101a33"],
];
const BG_DOCK_M: Array<[number, string]> = [
  [0.0, "#b8cdea"],
  [0.035, "#96aede"],
  [0.07, "#6e88d4"],
  [0.11, "#4560c0"],
  [0.17, "#2a3f97"],
  [0.22, "#1b2868"],
  [0.26, "#0f1531"],
  [0.3, "#0a0d16"],
  [0.55, "#0a0d16"],
  [0.67, "#101a33"],
  [0.8, "#1b2d5a"],
  [1.0, "#131f3e"],
];

/* Product placements, design px (also the glass-shader layer rects) */
const RECT_GLASSES_D: [number, number, number, number] = [277.35, 156, 1365.3, 768];
const RECT_DOCK_D: [number, number, number, number] = [510.9, 241.9, 907, 667.2];
const RECT_GLASSES_M: [number, number, number, number] = [-143.15, 150, 661.3, 372];
const RECT_DOCK_M: [number, number, number, number] = [-33, 244, 441, 324];

/* FY asset should stay screen-centered on both breakpoints. */
const X_START_D = 2740;
const X_END_D = 740;
const X_START_M = 740;
const X_END_M = 150;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth01 = (t: number) =>
  t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const mixOklch = (
  from: [number, number, number],
  to: [number, number, number],
  t: number,
) =>
  `oklch(${lerp(from[0], to[0], t).toFixed(3)} ${lerp(from[1], to[1], t).toFixed(3)} ${lerp(from[2], to[2], t).toFixed(1)})`;

function buildBgGradient(phase: number) {
  const t = smooth01(Math.max(0, Math.min(1, phase)));
  const stops = [
    { pos: lerp(0, 0, t), color: mixOklch([0.14, 0.02, 260], [0.08, 0.015, 258], t) },
    { pos: lerp(22, 30, t), color: mixOklch([0.14, 0.021, 259], [0.085, 0.018, 257], t) },
    { pos: lerp(45, 58, t), color: mixOklch([0.14, 0.02, 260], [0.09, 0.02, 256], t) },
    { pos: lerp(58, 72, t), color: mixOklch([0.24, 0.08, 258], [0.12, 0.05, 252], t) },
    { pos: lerp(70, 84, t), color: mixOklch([0.54, 0.1, 255], [0.08, 0.04, 248], t) },
    { pos: lerp(84, 94, t), color: mixOklch([0.68, 0.06, 249], [0.055, 0.018, 249], t) },
    { pos: 100, color: mixOklch([0.82, 0.03, 245], [0.04, 0.005, 250], t) },
  ];
  return `linear-gradient(180deg, ${stops.map((s) => `${s.color} ${s.pos.toFixed(1)}%`).join(", ")})`;
}

function paintBg(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  phase: number,
) {
  const t = smooth01(Math.max(0, Math.min(1, phase)));
  const g = ctx.createLinearGradient(0, 0, 0, h);
  const stops: Array<[number, string]> = [
    [lerp(0, 0, t) / 100, mixOklch([0.14, 0.02, 260], [0.08, 0.015, 258], t)],
    [lerp(22, 30, t) / 100, mixOklch([0.14, 0.021, 259], [0.085, 0.018, 257], t)],
    [lerp(45, 58, t) / 100, mixOklch([0.14, 0.02, 260], [0.09, 0.02, 256], t)],
    [lerp(58, 72, t) / 100, mixOklch([0.24, 0.08, 258], [0.12, 0.05, 252], t)],
    [lerp(70, 84, t) / 100, mixOklch([0.54, 0.1, 255], [0.08, 0.04, 248], t)],
    [lerp(84, 94, t) / 100, mixOklch([0.68, 0.06, 249], [0.055, 0.018, 249], t)],
    [1, mixOklch([0.82, 0.03, 245], [0.04, 0.005, 250], t)],
  ];
  for (const [offset, color] of stops) g.addColorStop(offset, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export const s03: Section = {
  id: "s02",
  html: `
  <div class="stage stage--d">
    <div class="s02-bg">
      <div class="s02-bgfill" aria-hidden="true"></div>
    </div>
    <div class="s02-content">
      <div class="s02-text">
        <div class="s02-badge cap-trim">The Anniversary Collection · 8.6.2026</div>
        <h1 class="s02-title gtx gtx--ice cap-trim">
          <span class="s02-strong">Five years</span> in the making.<br />A premium only you can feel.
        </h1>
        <p class="s02-sub cap-trim">Specs step back. The experience steps up.</p>
      </div>
      <div class="s02-scroll">
        <div class="s02-pullline" aria-hidden="true">
          <span class="s02-pullline-shaft"></span>
          <span class="s02-pullline-dot"></span>
        </div>
      </div>
    </div>
    <div class="s03-inner">
      <div class="s03-veil"></div>
      <div class="s03-veil s03-veil--dock"></div>
      <canvas class="s03-prod s03-prod--glasses" width="1920" height="1080" aria-hidden="true"></canvas>
      <img class="s03-prod s03-prod--dock" src="${A_D4}/imgMobileDock.webp" alt="" />
      <img class="s03-big" src="${FIVE_YEARS}" alt="Five Years" />
      <div class="s03-exit"></div>
    </div>
  </div>
  <div class="stage stage--m">
    <div class="s02-bg">
      <div class="s02-bgfill" aria-hidden="true"></div>
    </div>
    <div class="s02-content s02-content--m">
      <div class="s02-text s02-text--m">
        <div class="s02-badge s02-badge--m cap-trim">The Anniversary Collection · 8.6.2026</div>
        <h1 class="s02-title s02-title--m gtx gtx--ice cap-trim">
          <span class="s02-strong">Five years</span> in the making. A premium only you can feel.
        </h1>
        <p class="s02-sub s02-sub--m cap-trim">Specs step back. The experience steps up.</p>
      </div>
      <div class="s02-scroll s02-scroll--m">
        <div class="s02-pullline s02-pullline--m" aria-hidden="true">
          <span class="s02-pullline-shaft"></span>
          <span class="s02-pullline-dot"></span>
        </div>
      </div>
    </div>
    <div class="s03-inner">
      <div class="s03-veil s03-veil--m"></div>
      <div class="s03-veil s03-veil--dock-m"></div>
      <canvas class="s03-prod s03-prod--glasses-m" width="1920" height="1080" aria-hidden="true"></canvas>
      <img class="s03-prod s03-prod--dock-m" src="${A_MB}/imgMobileDock.webp" alt="" />
      <img class="s03-big s03-big--m" src="${FIVE_YEARS}" alt="Five Years" />
      <div class="s03-exit"></div>
    </div>
  </div>`,
  init(el, ctx) {
    const { gsap } = ctx;
    const mm = gsap.matchMedia();

    // Shared frame store (round 18): eager preload of all 30 alpha frames
    // once the section is within ±1 viewport; both breakpoint builds draw
    // from it.
    const store = mountFrameStore(
      el,
      ctx,
      Array.from({ length: FRAME_COUNT }, (_, i) => frameUrl(i)),
    );

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // QA harness freezes scrubbed timelines at a fixed progress; entrance
    // from-states would then stick, so skip them in that mode (cf. s10).
    const qaFixed =
      import.meta.env.DEV &&
      new URLSearchParams(location.search).has("progress");

    const q = (s: string) => Array.from(el.querySelectorAll<HTMLElement>(s));
    for (const t of q(".s02-title")) prepareText(t);
    for (const b of q(".s02-badge")) prepareText(b, { mode: "block" });
    for (const p of q(".s02-sub")) prepareText(p, { mode: "block" });
    const introTl = ctx.gsap.timeline({
      scrollTrigger: { trigger: el, start: "top 78%" },
    });
    for (const t of q(".s02-title")) introTl.add(revealText(t), 0);
    for (const b of q(".s02-badge")) introTl.add(revealText(b), 0.45);
    for (const p of q(".s02-sub")) introTl.add(revealText(p), 0.65);
    introTl.from(
      q(".s02-scroll"),
      { opacity: 0, duration: 1.2, ease: "sine.out" },
      1.0,
    );

    const build = (isMobile: boolean) => () => {
      const stage = el.querySelector<HTMLElement>(
        isMobile ? ".stage--m" : ".stage--d",
      )!;
      const bg = stage.querySelector<HTMLElement>(".s02-bg")!;
      const content = stage.querySelector<HTMLElement>(".s02-content")!;
      const text = stage.querySelector<HTMLElement>(".s02-text")!;
      const line = stage.querySelector<HTMLElement>(".s02-pullline")!;
      const bgFill = stage.querySelector<HTMLElement>(".s02-bgfill")!;
      const inner = stage.querySelector<HTMLElement>(".s03-inner")!;
      const prodA = stage.querySelector<HTMLCanvasElement>(
        isMobile ? ".s03-prod--glasses-m" : ".s03-prod--glasses",
      )!;
      const prodACtx = prodA.getContext("2d")!;
      const prodB = stage.querySelector<HTMLImageElement>(
        isMobile ? ".s03-prod--dock-m" : ".s03-prod--dock",
      )!;
      const big = stage.querySelector<HTMLElement>(".s03-big")!;
      const exit = stage.querySelector<HTMLElement>(".s03-exit")!;
      const veilDock = stage.querySelector<HTMLElement>(
        isMobile ? ".s03-veil--dock-m" : ".s03-veil--dock",
      )!;

      const stageW = isMobile ? 375 : 1920;
      const stageH = isMobile ? 812 : 1080;
      const xFrom = isMobile ? X_START_M : X_START_D;

      const glassWidth = isMobile ? 660 : 1540;
      const glassHeight = isMobile ? 118.5 : 276.4;
      const liquidGlass = createLiquidGlass({
        host: inner,
        x: xFrom,
        y: stageH / 2 + 0.5,
        width: glassWidth,
        height: glassHeight,
        maskUrl: FIVE_YEARS_SVG,
      });
      big.style.visibility = "hidden";

      // ---- scroll-scrubbed frame drawing (round 18) ----
      // The scrub progress maps to a frame index (0→29 across p 0→FRAME_END,
      // clamped — held at 29 beyond); the frame is drawn into the slot
      // canvas, which doubles as the glass shader's composition layer, and
      // the shader background is re-uploaded whenever the index changes.
      // Backwards scrolling maps to lower indices — bidirectional for free.
      const frameEnd = isMobile ? FRAME_END_M : FRAME_END_D;
      let curFrame = -1;
      let drawnFrame = -1;
      const frameFor = (p: number) =>
        reducedMotion
          ? FRAME_COUNT - 1
          : Math.max(
              0,
              Math.min(
                FRAME_COUNT - 1,
                Math.round((p / frameEnd) * (FRAME_COUNT - 1)),
              ),
            );
      const drawFrame = () => {
        if (curFrame < 0 || drawnFrame === curFrame || !store.loaded[curFrame])
          return;
        prodACtx.clearRect(0, 0, prodA.width, prodA.height);
        prodACtx.drawImage(store.frames[curFrame], 0, 0);
        drawnFrame = curFrame;
      };
      const loadHook = (i: number) => {
        if (i === curFrame) drawFrame();
      };
      store.onLoad.add(loadHook);

      // One driver object: the visible DOM products and the glass shader's
      // background layers stay in perfect sync (same alpha/offset/scale).
      const st = {
        x: xFrom,
        // p spans the FULL 0..1 range on both breakpoints: the glass
        // shader's streak rest-envelope is zero exactly at 0 and 1, so the
        // entrance/release plateaus show clean streak-free glass (round 8)
        p: 0,
        aA: 0,
        dxA: 0,
        dyA: 0,
        sA: 1.5,
        aB: 0,
        dxB: isMobile ? 0 : 110,
        dyB: isMobile ? 70 : 40,
        sB: 1.04,
        lineH: isMobile ? 72 : 128,
        lineB: 0,
        lineA: 1,
        bgT: 0,
        sceneY: 0,
      };
      const stretchedLineH = isMobile ? 220 : 300;
      const apply = () => {
        const f = frameFor(st.p);
        if (f !== curFrame) curFrame = f;
        drawFrame();
        bgFill.style.background = buildBgGradient(st.bgT);
        gsap.set(bg, { y: st.sceneY });
        gsap.set(content, { y: st.sceneY });
        gsap.set(inner, { y: st.sceneY });
        gsap.set(line, {
          height: st.lineH,
          bottom: st.lineB,
          autoAlpha: st.lineA,
        });
        gsap.set(prodA, {
          autoAlpha: st.aA,
          x: st.dxA,
          y: st.dyA,
          scale: st.sA,
        });
        gsap.set(prodB, {
          autoAlpha: st.aB,
          x: st.dxB,
          y: st.dyB,
          scale: st.sB,
        });
        gsap.set(veilDock, { opacity: st.aB });
        liquidGlass.setX(st.x);
        liquidGlass.setOpacity(Math.max(st.aA, st.aB));
      };
      apply();

      // Pinned journey: glass text travel leads; the product swap happens
      // mid-travel behind it (A dissolves out before B is fully in — no
      // stacked half-transparent products); the veil field never breaks.
      // The last stretch dissolves everything toward s05's dark field.
      const tl = gsap.timeline({
        onUpdate: apply,
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: isMobile ? "+=290%" : "+=460%",
          pin: true,
          scrub: 0.6,
          onRefresh: apply,
        },
        defaults: { ease: "none" },
      });

      if (!isMobile) {
        // swap lands EARLY: the dock must be fully lit by mid-pin (the
        // flagged 0.5 frame is a "dock state" beat — a late fade left it
        // at ~6% alpha, a near-empty washed frame)
        tl.to(st, { lineH: stretchedLineH, duration: 0.18 }, 0)
          .to(st, { bgT: 1, duration: 0.92 }, 0)
          .to(text, { autoAlpha: 0, y: -120, duration: 0.2 }, 0)
          .to(
            st,
            { lineH: 0, lineB: stretchedLineH, lineA: 0, duration: 0.12 },
            0.18,
          )
          .to(content, { autoAlpha: 0, duration: 0.08 }, 0.24)
          .to(st, { aA: 1, sA: 1, duration: 0.18 }, 0.02)
          .to(st, { x: X_END_D, duration: 1.02 }, 0.26)
          .to(st, { p: 1, duration: 0.48 }, 0.18)
          .to(st, { aA: 0, dxA: -90, dyA: -30, sA: 0.97, duration: 0.13 }, 0.7)
          .to(st, { aB: 1, dxB: 0, dyB: 0, sB: 1, duration: 0.13 }, 0.8)
          .to(st, { sceneY: -180, duration: 0.18 }, 1.24)
          .fromTo(
            exit,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 0.14, ease: "power1.in" },
            1.28,
          );
      } else {
        // vertical version of the swap under a static glass line — dock
        // fully in by mid-pin, same as desktop
        tl.to(st, { lineH: stretchedLineH, duration: 0.18 }, 0)
          .to(st, { bgT: 1, duration: 0.92 }, 0)
          .to(text, { autoAlpha: 0, y: -84, duration: 0.2 }, 0)
          .to(
            st,
            { lineH: 0, lineB: stretchedLineH, lineA: 0, duration: 0.12 },
            0.18,
          )
          .to(content, { autoAlpha: 0, duration: 0.08 }, 0.24)
          .to(st, { aA: 1, sA: 1, duration: 0.18 }, 0.02)
          .to(st, { x: X_END_M, duration: 1.02 }, 0.26)
          .to(st, { p: 1, duration: 0.48 }, 0.18)
          .to(st, { aA: 0, dyA: -50, sA: 0.97, duration: 0.18 }, 0.7)
          .to(st, { aB: 1, dyB: 0, sB: 1, duration: 0.16 }, 0.8)
          .to(st, { sceneY: -140, duration: 0.18 }, 1.24)
          .fromTo(
            exit,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 0.16, ease: "power1.in" },
            1.28,
          );
      }

      return () => {
        store.onLoad.delete(loadHook);
        liquidGlass.destroy();
      };
    };

    mm.add("(min-width: 641px)", build(false));
    mm.add("(max-width: 640px)", build(true));
  },
};
