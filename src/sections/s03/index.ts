import "./style.css";
import type { Section } from "../../lib/section";
import { createGlassText, type GlassText } from "../../lib/glasstext";
import { mountFrameStore } from "../../lib/frameseq";

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

const A_D4 = "/assets/1920_Screen-04-01";
const A_MB = "/assets/375_Screen-03-01b";

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
const RECT_GLASSES_D: [number, number, number, number] = [245.35, 156, 1365.3, 768];
const RECT_DOCK_D: [number, number, number, number] = [510.9, 241.9, 907, 667.2];
const RECT_GLASSES_M: [number, number, number, number] = [-199.15, 150, 661.3, 372];
const RECT_DOCK_M: [number, number, number, number] = [-33, 244, 441, 324];

/* Text-center journey (matches Figma Screen-03-01 → Screen-04-01) */
const X_FROM_D = 1631;
const X_TO_D = 251;
const X_M = 549.5;

export const s03: Section = {
  id: "s03",
  html: `
  <div class="stage stage--d">
    <div class="s03-inner">
      <div class="s03-veil"></div>
      <div class="s03-veil s03-veil--dock"></div>
      <canvas class="s03-prod s03-prod--glasses" width="1920" height="1080" aria-hidden="true"></canvas>
      <img class="s03-prod s03-prod--dock" src="${A_D4}/imgMobileDock.webp" alt="" />
      <p class="s03-big cap-trim">Five Years</p>
      <div class="s03-exit"></div>
    </div>
  </div>
  <div class="stage stage--m">
    <div class="s03-inner">
      <div class="s03-veil s03-veil--m"></div>
      <div class="s03-veil s03-veil--dock-m"></div>
      <canvas class="s03-prod s03-prod--glasses-m" width="1920" height="1080" aria-hidden="true"></canvas>
      <img class="s03-prod s03-prod--dock-m" src="${A_MB}/imgMobileDock.webp" alt="" />
      <p class="s03-big s03-big--m cap-trim">Five Years</p>
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

    const build = (isMobile: boolean) => () => {
      const stage = el.querySelector<HTMLElement>(
        isMobile ? ".stage--m" : ".stage--d",
      )!;
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
      const xFrom = isMobile ? X_M : X_FROM_D;

      const glass: GlassText | null = createGlassText({
        host: inner,
        stageW,
        stageH,
        text: "Five Years",
        fontFamily: '"Season Sans", sans-serif',
        fontWeight: "400",
        fontSize: isMobile ? 240 : 400,
        x: xFrom,
        y: stageH / 2 + 0.5,
        bgStops: isMobile ? BG_GLASSES_M : BG_GLASSES_D,
        bgStopsB: isMobile ? BG_DOCK_M : BG_DOCK_D,
        layers: [
          {
            image: prodA,
            rect: isMobile ? RECT_GLASSES_M : RECT_GLASSES_D,
          },
          { image: prodB, rect: isMobile ? RECT_DOCK_M : RECT_DOCK_D },
        ],
        /* transmission-glass params (round 6 base, round 9 presence bump:
           the etch read as a ghost at rest — raise the milky lift ~+37%,
           push the lens displacement so product edges seen through glyphs
           bend clearly, and widen the hairline so displaced letter edges
           stay crisp; ca unchanged — no rainbow noise) */
        shift: isMobile ? 6 : 8,
        magnify: isMobile ? 1.07 : 1.065,
        thick: isMobile ? 15 : 24,
        refract: isMobile ? 17 : 26,
        ca: 0.015,
        frost: isMobile ? 5 : 7,
        lift: 0.041,
        edge: isMobile ? 1.9 : 2.6,
        spec: 0.32,
        fresnel: 0.055,
        streak: 0.19,
        flow: isMobile ? 16 : 30,
        /* round 20: crystal facets tried and REVERTED per client ("get back
           to previous version") — crack stays 0/off; the liquid-lens look
           above is the approved one */
        onReady() {
          // WebGL path live — retire the flat CSS watermark
          big.style.visibility = "hidden";
        },
      });

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
        glass?.invalidateBg();
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
        aA: 1,
        dxA: 0,
        dyA: 0,
        sA: 1,
        aB: 0,
        dxB: isMobile ? 0 : 110,
        dyB: isMobile ? 70 : 40,
        sB: 1.04,
      };
      const apply = () => {
        const f = frameFor(st.p);
        if (f !== curFrame) curFrame = f;
        drawFrame();
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
        // veil state follows the dock: bottom bloom grows as B fades in,
        // mirrored 1:1 into the glass shader's refraction gradient
        gsap.set(veilDock, { opacity: st.aB });
        if (glass) {
          glass.setX(st.x);
          glass.setProgress(st.p); // travelling streak + refraction flow
          glass.setBgMix(st.aB);
          glass.setLayer(0, {
            alpha: st.aA,
            dx: st.dxA,
            dy: st.dyA,
            scale: st.sA,
          });
          glass.setLayer(1, {
            alpha: st.aB,
            dx: st.dxB,
            dy: st.dyB,
            scale: st.sB,
          });
          glass.render();
        } else {
          gsap.set(big, { x: st.x - xFrom });
        }
      };
      apply();

      if (!qaFixed && !isMobile) {
        // entrance animates the WRAPPER only — the products and the CSS
        // fallback are written every scrub tick by apply(), and a from()
        // tween on the same elements would fight it (and win) after a
        // fast scroll jump, freezing product A at full opacity
        gsap.from(inner, {
          scrollTrigger: { trigger: el, start: "top 78%" },
          autoAlpha: 0,
          y: 40,
          scale: 1.02,
          transformOrigin: "50% 50%",
          ease: "power3.out",
          duration: 1,
        });
      }

      // Pinned journey: glass text travel leads; the product swap happens
      // mid-travel behind it (A dissolves out before B is fully in — no
      // stacked half-transparent products); the veil field never breaks.
      // The last stretch dissolves everything toward s05's dark field.
      const tl = gsap.timeline({
        onUpdate: apply,
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: isMobile ? "+=150%" : "+=300%",
          pin: true,
          scrub: 0.6,
        },
        defaults: { ease: "none" },
      });

      if (!isMobile) {
        // swap lands EARLY: the dock must be fully lit by mid-pin (the
        // flagged 0.5 frame is a "dock state" beat — a late fade left it
        // at ~6% alpha, a near-empty washed frame)
        tl.to(st, { x: X_TO_D, duration: 0.85 }, 0)
          .to(st, { p: 1, duration: 1 }, 0)
          .to(st, { aA: 0, dxA: -90, dyA: -30, sA: 0.97, duration: 0.13 }, 0.22)
          .to(st, { aB: 1, dxB: 0, dyB: 0, sB: 1, duration: 0.13 }, 0.36)
          .fromTo(
            exit,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 0.14, ease: "power1.in" },
            0.86,
          );
      } else {
        // vertical version of the swap under a static glass line — dock
        // fully in by mid-pin, same as desktop
        tl.to(st, { p: 1, duration: 1 }, 0)
          .to(st, { aA: 0, dyA: -50, sA: 0.97, duration: 0.18 }, 0.14)
          .to(st, { aB: 1, dyB: 0, sB: 1, duration: 0.16 }, 0.34)
          .fromTo(
            exit,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 0.16, ease: "power1.in" },
            0.84,
          );
      }

      return () => {
        store.onLoad.delete(loadHook);
        glass?.destroy();
      };
    };

    mm.add("(min-width: 641px)", build(false));
    mm.add("(max-width: 640px)", build(true));
  },
};
