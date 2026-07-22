import "./style.css";
import type { Section } from "../../lib/section";
import { mountFrameStore } from "../../lib/frameseq";

/* s15 — merged page (former s15 + s16, client round 5; unpinned round 7):
 * one "Thin Enough to Disappear" page; the copy and the 16%/20% stats
 * persist over the top-down glasses render.
 *
 * Client round 19 — TWO-asset canvas choreography (replaces the round-18
 * single-video hold/crossfade cycle): on section arrival the STATIC clip
 * (settle-to-hold) plays once, then the ANIM clip (light-sweep flourish)
 * plays forward, then backwards, then keeps ping-ponging fwd/back in a
 * continuous loop while the section is in view. Both clips are 30 alpha
 * WebP frames (1920×1080/30fps, extracted from the delivered ProRes
 * masters by scripts/extract-thin-frames.mjs) drawn onto one canvas per
 * breakpoint via the shared frame store (rect-based ±1-viewport eager
 * preload, cf. s03/s11).
 *
 * Seams (measured on the extracted WebPs): static's LAST frame ≈ anim's
 * FIRST frame (45dB PSNR — visually identical), so the static→anim splice
 * is clean and anim[0] is skipped at the handoff to keep 30fps motion
 * continuous; the ping-pong turns are seamless by construction (the
 * reversal replays the same frames) and run continuous, no turn beat.
 *
 * Offscreen the loop pauses; on RE-entry the static intro is skipped and
 * the anim ping-pong resumes. prefers-reduced-motion (and the QA freeze)
 * shows a still: static's settled final frame, fetched alone.
 *
 * Placement (design px) — PRESERVED from round 18, do not touch: the
 * frames render the glasses front-bar-up while the design rests
 * front-bar-down, so the canvas is rotated 180°; the rotated pose-A alpha
 * bbox is then mapped onto the harvest render's pair bbox in stage coords
 * (left pair of imgGlasses1.webp (434,383,1073,1106) in its 2560×1440
 * source → stage (1007.17,233.59,1572.98,874.37) desktop,
 * (65.49,439.26,307.89,714.01) mobile via the old crop-A img rects):
 *   desktop: canvas element 1492.27×814.19 at (-411.05,10.28) in the window
 *   mobile:  canvas element 639.30×349.09 at (-176.96,4.40)
 * (~3% deliberate non-uniform stretch — the client render's pose aspect
 * differs slightly from the harvest still; the canvas box honors it.)
 */

const D15 = "/assets/1920_Screen-15-01";
const M15 = "/assets/375_Screen-15-01";

const N = 30; // frames per clip
const FPS = 30;
const STEP = 1000 / FPS;
const staticUrl = (i: number) =>
  `/assets/thin-frames/static/ts-${String(i).padStart(2, "0")}.webp`;
const animUrl = (i: number) =>
  `/assets/thin-frames/anim/ta-${String(i).padStart(2, "0")}.webp`;

const CANVAS = `<canvas class="s15-vid" width="1920" height="1080" aria-hidden="true"></canvas>`;

const content = `
  <p class="s15-eyebrow">Slimmer Than Pro</p>
  <h2 class="s15-title gtx gtx--warm">Thin Enough to Disappear</h2>
  <div class="s15-line"><img src="__M__/imgLine.svg" alt="" /></div>
  <div class="s15-benefits">
    <div class="s15-benefit">
      <p class="s15-stat gtx gtx--warm">16%</p>
      <p class="s15-label">Thinner</p>
    </div>
    <div class="s15-benefit">
      <p class="s15-stat gtx gtx--warm">20%</p>
      <p class="s15-label">Lighter</p>
    </div>
  </div>`;

export const s15: Section = {
  id: "s15",
  html: `
    <div class="stage stage--d">
      <div class="s15-bg"></div>
      <div class="s15-glow">
        <div class="s15-glow-in"><img src="${D15}/imgEllipse1329130924.baked.webp" alt="" /></div>
      </div>
      <div class="s15-glasses">${CANVAS}</div>
      <div class="s15-content">${content.replace("__M__", D15)}</div>
    </div>
    <div class="stage stage--m">
      <div class="s15-bg"></div>
      <div class="s15-glow s15-glow--m">
        <div class="s15-glow-in"><img src="${M15}/imgEllipse1329130924.baked.webp" alt="" /></div>
      </div>
      <div class="s15-glasses s15-glasses--m">${CANVAS}</div>
      <div class="s15-content s15-content--m">${content.replace("__M__", M15)}</div>
    </div>
  `,
  init(el, ctx) {
    const { gsap, ScrollTrigger, lenis } = ctx;
    const mm = gsap.matchMedia();

    // QA harness (?progress=p): freeze the scene (poster still, no loop)
    // and skip entrances so their from-states can't stick (cf. s03/s10).
    const qaProgress = (() => {
      if (!import.meta.env.DEV) return null;
      const raw = new URLSearchParams(location.search).get("progress");
      if (raw === null) return null;
      const p = parseFloat(raw);
      return Number.isNaN(p) ? null : p;
    })();

    // entrances stay per-breakpoint (copy + stats + glow + glasses slot);
    // they touch only the slot container, never the canvas itself, so
    // they can't fight the frame loop below.
    const build = (isMobile: boolean) => () => {
      if (qaProgress !== null) return;
      const stage = el.querySelector<HTMLElement>(
        isMobile ? ".stage--m" : ".stage--d",
      )!;
      const q = (s: string) => stage.querySelectorAll<HTMLElement>(s);
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: "top 78%" },
        defaults: { ease: "power3.out", duration: 0.9 },
      });
      tl.from(q(".s15-glow"), { opacity: 0, scale: 1.05, duration: 1 }, 0)
        .from(q(".s15-glasses"), { opacity: 0, y: 40, duration: 1 }, 0)
        .from(q(".s15-eyebrow"), { opacity: 0, y: 36 }, 0.12)
        .from(q(".s15-title"), { opacity: 0, y: 36 }, 0.22)
        .from(q(".s15-line"), { opacity: 0, scaleX: 0, transformOrigin: "left center", duration: 0.7 }, 0.38)
        .from(q(".s15-benefit"), { opacity: 0, y: 36, stagger: 0.1 }, 0.46);
    };
    mm.add("(min-width: 641px)", build(false));
    mm.add("(max-width: 640px)", build(true));

    /* --------------------------- frame loop ---------------------------- */

    // one canvas per breakpoint stage; only the canvas whose stage is
    // displayed (offsetParent !== null) is painted each tick
    const canvases = Array.from(
      el.querySelectorAll<HTMLCanvasElement>("canvas.s15-vid"),
    );
    const ctx2ds = canvases.map((c) => c.getContext("2d")!);
    const drawnKey: string[] = canvases.map(() => "");

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      qaProgress !== null
    ) {
      // still mode: static's settled final frame only — never fetch the
      // sequences (one 28KB poster frame instead of 60 frames)
      const poster = new Image();
      poster.decoding = "async";
      poster.addEventListener(
        "load",
        () => {
          for (const c of ctx2ds) {
            c.clearRect(0, 0, 1920, 1080);
            c.drawImage(poster, 0, 0);
          }
        },
        { once: true },
      );
      poster.src = staticUrl(N - 1);
      return;
    }

    // eager preload of both 30-frame clips once within ±1 viewport
    const sStatic = mountFrameStore(
      el,
      ctx,
      Array.from({ length: N }, (_, i) => staticUrl(i)),
    );
    const sAnim = mountFrameStore(
      el,
      ctx,
      Array.from({ length: N }, (_, i) => animUrl(i)),
    );

    // sequencer: static 0→29 once (arrival intro) → anim ping-pong
    // 1→29→…→0→…, forever; state survives pauses so re-entry resumes
    let phase: "static" | "anim" = "static";
    let idx = 0;
    let dir: 1 | -1 = 1;

    const store = () => (phase === "static" ? sStatic : sAnim);

    const draw = () => {
      const s = store();
      if (!s.loaded[idx]) return; // repainted by the onLoad hook below
      const key = `${phase}:${idx}`;
      canvases.forEach((cv, i) => {
        if (cv.offsetParent === null || drawnKey[i] === key) return;
        ctx2ds[i].clearRect(0, 0, 1920, 1080);
        ctx2ds[i].drawImage(s.frames[idx], 0, 0);
        drawnKey[i] = key;
      });
    };
    const loadHook = (i: number) => {
      if (i === idx) draw();
    };
    sStatic.onLoad.add(loadHook);
    sAnim.onLoad.add(loadHook);
    draw();

    // step to the next frame; returns false (and holds) if it isn't
    // decodable yet so slow networks stall instead of skipping frames
    const advance = (): boolean => {
      let nPhase = phase;
      let nIdx: number;
      let nDir = dir;
      if (phase === "static") {
        if (idx < N - 1) {
          nIdx = idx + 1;
        } else {
          // intro done — splice into the anim. anim[0] ≈ static[29]
          // (45dB PSNR), so start at 1 to keep the motion continuous
          nPhase = "anim";
          nIdx = 1;
          nDir = 1;
        }
      } else {
        nIdx = idx + dir;
        if (nIdx >= N) {
          // forward pass done → play backwards (29 already shown; no
          // endpoint double — the turn reads as one continuous motion)
          nIdx = N - 2;
          nDir = -1;
        } else if (nIdx < 0) {
          // backward pass done → forward again (ping-pong)
          nIdx = 1;
          nDir = 1;
        }
      }
      const s = nPhase === "static" ? sStatic : sAnim;
      if (!s.loaded[nIdx]) return false;
      phase = nPhase;
      idx = nIdx;
      dir = nDir;
      return true;
    };

    // rAF driver at 30fps (accumulator; a long stall — tab blur, jank —
    // resumes with a single step instead of a burst catch-up)
    let raf = 0;
    let last = 0;
    let acc = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (last === 0) last = t;
      let dt = t - last;
      last = t;
      if (dt > 250) dt = STEP;
      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < 3) {
        if (!advance()) {
          acc = 0;
          break;
        }
        acc -= STEP;
        steps++;
      }
      draw();
    };
    const start = () => {
      if (raf) return;
      last = 0;
      acc = 0;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    // rect-based visibility gate — same listener trio as lib/lazyvideo
    // (deliberately NOT IntersectionObserver; see that module's header)
    let wasVisible = false;
    const update = () => {
      const r = el.getBoundingClientRect();
      const visible = r.bottom > 0 && r.top < window.innerHeight;
      if (visible && !wasVisible) {
        start();
      } else if (!visible && wasVisible) {
        stop();
        // once the intro has completed, phase is "anim" forever and every
        // re-entry resumes the ping-pong (intro skipped). If we leave
        // while still in "static", the intro was NOT genuinely watched —
        // this includes the boot-time layout transient that briefly flags
        // the section visible before stages settle (observed on WebKit) —
        // so rewind it and let the real arrival play it from the top.
        if (phase === "static") idx = 0;
      }
      wasVisible = visible;
    };

    lenis.on("scroll", update);
    window.addEventListener("scroll", update, { passive: true });
    ScrollTrigger.addEventListener("refresh", update);
    update();

    // DEV-only probe handle for the QA scripts (cf. scripts/_probe-thin2.mjs)
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__s15thin = {
        get state() {
          return { phase, idx, dir, running: raf !== 0 };
        },
      };
    }
  },
};
