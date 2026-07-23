import "./style.css";
import type { Section } from "../../lib/section";
import { mountFrameStore } from "../../lib/frameseq";

/* s27 — merged pinned page (former s27 + s28, client round 7):
 * ONE "Exclusive offer on the anniversary collection" bar for the whole
 * finale — it anchors the bottom of the screen and never fades, moves or
 * duplicates while the page behind it swaps states:
 *
 *   A  "The Classic Returns" hero photo   (1920_Screen-27-01 / 375_…-27-01a)
 *   B  "Five years in the making" still   (1920_Screen-28-01 / 375_…-27-01b)
 *
 * The hero cross-blends into the still mid-pin (long soft fade with a
 * slight counter scale drift — both frames live in the same near-black
 * warm family, so no veil beat is needed) while the copy does the site's
 * sequential vertical roll (cf. s16b): title A + tagline roll out upward,
 * then title B + the spec strip roll in from below — never overlapping.
 * Rest plateaus at both ends; this is the final section, so the pin
 * releases onto the calm state-B frame.
 */

const AD = "/assets/1920_Screen-27-01";
const BD = "/assets/1920_Screen-28-01";
const AM = "/assets/375_Screen-27-01a";
const BM = "/assets/375_Screen-27-01b";

const SPECS =
  "UltraClarity 3.0 · 63g · Ergo-perfect · Razor-thin · Myopia −5.00D · SGS A+";

/* Client round 19 — TRANSPARENT product videos (HEVC-alpha .mov for Safari +
 * VP9-alpha .webm for Chromium, 1920×1080/1s/30fps, alpha-verified):
 *   a  classic.*  → state A, the "Classic Returns" hero product
 *   b  finale.*   → state B, the "Five years" front-on product
 * Each video is a full-frame render of ONLY the product (the field is
 * transparent), so it REPLACES its state's baked product: the video rides
 * inside the state's fading group, and the group's <img> (kept as the
 * pre-load / reduced-motion fallback) is hidden the moment the video first
 * presents frames (.s27-live, see style.css). Stacking the video over a
 * visible photo is NOT an option — the photo's product pose differs
 * slightly, and its bright rim (up to full-white temple-tip pixels) reads
 * as a ghost outline around the video product (measured: ~14% of the
 * photo's bright pixels stay uncovered).
 *
 * Placement is bbox-mapped, not full-bleed: the video's product alpha bbox
 * is registered onto the design product's bbox in stage px —
 *   classic f29 alpha bbox (451,139,1521,898)  → design (384.8,144.0,1422.8,897.8)
 *     uniform scale 0.9701, center-matched → element (-52.7,17.9) 1862.6×1047.7
 *   finale  f29 alpha bbox (158,187,1762,1045) → design (315.8,420.0,1622.2,1079+)
 *     (design bottom is frame-cropped, so width+top matched)
 *     uniform scale 0.8145 → element (187.1,267.7) 1563.8×879.7
 * Mobile maps the same element rects through each state's measured design
 * transform (see style.css). */
/* Classic (A) is a CANVAS frame sequence, not a video (round 20): the
 * client wants it to play backwards on scroll-back, and <video> can't seek
 * smoothly in reverse — so the pinned scrub maps progress→frame exactly
 * like s03's Five Years asset (30 alpha WebPs, bidirectional for free).
 * Finale (B) stays a play-once video (it fires on a forward crossing). */
const VID = (which: "a" | "b") =>
  which === "a"
    ? `<canvas class="s27-vid s27-vid-a" width="1920" height="1080" aria-hidden="true"></canvas>`
    : `
    <video class="s27-vid s27-vid-b" muted playsinline preload="metadata" aria-hidden="true">
      <source src="/video/finale-hevc.mov" type="video/quicktime" />
      <source src="/video/finale.webm" type="video/webm" />
    </video>`;
const CL_FRAMES = 30;
const CL_URLS = Array.from(
  { length: CL_FRAMES },
  (_, i) => `/assets/classic-frames/cl-${String(i).padStart(2, "0")}.webp`,
);
/* the classic sequence finishes exactly where its fade-out begins */
const CL_END = 0.3;

const desktop = `
  <div class="s27-hero"><div class="s27-hero-in">
    <img class="s27-bg" src="${AD}/img1920Screen2701.webp" alt="">${VID("a")}
  </div></div>
  <div class="s27-still-g">
    <img class="s27-still" src="${BD}/imgStillsIt322.webp" alt="">${VID("b")}
  </div>
  <div class="s27-text">
    <h2 class="s27-title gtx gtx--peach">The Classic Returns</h2>
    <p class="s27-tagline">Calling all VITURE Pro owners</p>
  </div>
  <h2 class="s27-title-b gtx gtx--peach"><b>Five years</b> in the making.<br>A premium only you can feel.</h2>
  <div class="s27-bottom">
    <p class="s27-specs">${SPECS}</p>
    <div class="s27-block">
      <div class="s27-flare"><img src="${AD}/export.webp" alt=""></div>
      <div class="s27-left">
        <p class="s27-offer-title">Exclusive offer on the anniversary collection</p>
        <p class="s27-offer-sub">The classic that started it all — reborn for year five.</p>
      </div>
      <div class="s27-right">
        <div class="s27-off">
          <span class="s27-price">$20</span>
          <span class="s27-offword"><span>off</span></span>
        </div>
        <div class="s27-vline"></div>
        <button class="s27-btn" type="button">Grab NOW</button>
      </div>
    </div>
  </div>`;

const mobile = `
  <div class="s27-hero-m"><div class="s27-hero-in">
    <img src="${AM}/imgHeroStill4000000024.webp" alt="">${VID("a")}
  </div></div>
  <div class="s27-still-g">
    <img class="s27-still-m" src="${BM}/imgStillsIt322.webp" alt="">${VID("b")}
  </div>
  <div class="s27-text-m">
    <h2 class="s27-title-m gtx gtx--peach">The Classic<br>Returns</h2>
    <p class="s27-tagline-m">Calling all VITURE Pro owners</p>
  </div>
  <h2 class="s27-title-b-m gtx gtx--peach"><b>Five years</b> in the making. A premium only you can feel.</h2>
  <div class="s27-bottom-m">
    <p class="s27-specs-m">${SPECS}</p>
    <div class="s27-block-m">
      <div class="s27-flare s27-flare--m"><img src="${AM}/export.webp" alt=""></div>
      <div class="s27-left-m">
        <p class="s27-offer-title-m">Exclusive offer on the anniversary collection</p>
        <p class="s27-offer-sub-m">The classic that started it all — reborn for year five.</p>
      </div>
      <div class="s27-right-m">
        <div class="s27-off s27-off--m">
          <span class="s27-price-m">$20</span>
          <span class="s27-offword s27-offword--m"><span>off</span></span>
        </div>
        <div class="s27-vline s27-vline--m"></div>
        <button class="s27-btn s27-btn--m" type="button">Grab Now</button>
      </div>
    </div>
  </div>`;

export const s27: Section = {
  id: "s27",
  html: `
    <div class="stage stage--d">${desktop}</div>
    <div class="stage stage--m">${mobile}</div>
  `,
  init(el, ctx) {
    const { gsap } = ctx;

    // QA harness freezes scrubbed timelines at a fixed progress; entrance
    // from-states would then stick, so skip them in that mode (cf. s03/s16b).
    const qaFixed =
      import.meta.env.DEV &&
      new URLSearchParams(location.search).has("progress");

    // Entrance timeline handle — the pinned scrub force-completes it the
    // moment the pin engages (see onEnter below), so its 1s time-based
    // tweens are guaranteed done before any pin state matters. Client bug
    // (round 9): a visitor who rode straight into the pin faster than the
    // entrance had two writers racing on the hero, and the resting frame
    // was whichever rendered last — hero AND still both visible, a double
    // exposure the user couldn't scroll away at the page bottom. Defense
    // in depth now: entrance and scrub target disjoint elements (wrapper
    // vs inner image), the scrub inits pristine at build (see defaults),
    // and onEnter retires the entrance outright.
    let intro: gsap.core.Timeline | null = null;

    /* ---- transparent product videos (round 19) -----------------------
     * Play-once-per-arrival lifecycle, per state:
     *   A (classic) plays when the section arrives in the viewport (it is
     *     already alive through the entrance, cf. s16b), then holds its
     *     last frame; every fresh viewport re-entry replays it.
     *   B (finale) fires on the pinned scrub's FORWARD crossing into the
     *     reveal window (B_ON, just after the still-group starts
     *     fading in at 0.46) and holds; scrubbing back below B_OFF re-arms
     *     it AND resets it to its transparent frame 0, so the next forward
     *     crossing replays the reveal — and a stale held frame can never
     *     linger under a scrub-back (hysteresis so jitter at the threshold
     *     can't machine-gun restarts).
     * No ghost double-exposure is possible by construction: each video
     * lives INSIDE its state's fading group (.s27-hero-in / .s27-still-g),
     * so the scrub's existing autoAlpha choreography clips both the video
     * and its fallback img together.
     * Loading follows the lazyvideo proximity contract (±1 viewport →
     * preload auto + load(); rect-based, NOT IntersectionObserver — see
     * lib/lazyvideo.ts header for why). Reduced motion: videos never load
     * or play; the baked design stills stay (imgs are only hidden by
     * .s27-live once a video actually presents frames). */
    const vidsB = Array.from(el.querySelectorAll<HTMLVideoElement>(".s27-vid-b"));
    const allVids = vidsB;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // the fallback img hides only when its sibling video ACTUALLY presents
    // frames — a stalled/failed video leaves the baked still in place
    for (const v of allVids)
      v.addEventListener("playing", () =>
        v.parentElement!.classList.add("s27-live"),
      );
    const B_ON = 0.48; // forward crossing: still-group fade-in is underway
    const B_OFF = 0.42; // re-arm + reset below this (hysteresis gap)
    const bState = { live: false }; // shared with the per-breakpoint scrubs
    const playFromStart = (vids: HTMLVideoElement[]) => {
      if (reduced) return;
      for (const v of vids) {
        if (v.offsetParent === null) continue; // hidden breakpoint twin
        try {
          if (v.currentTime > 0.001) v.currentTime = 0;
        } catch {
          /* metadata not ready yet — play() starts from 0 anyway */
        }
        v.play().catch(() => {});
      }
    };
    const parkAtStart = (vids: HTMLVideoElement[]) => {
      for (const v of vids) {
        if (!v.paused) v.pause();
        try {
          if (v.currentTime > 0.001) v.currentTime = 0;
        } catch {
          /* not loaded — already at 0 */
        }
      }
    };

    /* ---- classic (A) frame-sequence canvas (round 20) -----------------
     * The pinned scrub maps p∈[0, CL_END] → frame 0..29 (clamped, held at
     * 29 through A's fade-out window), so scrolling back plays the asset
     * backwards frame-exactly — cf. s03. Both breakpoint canvases share
     * one store; the baked hero img hides (.s27-live) after the first
     * paint. Reduced motion: frames never load, the baked img stays. */
    const clCanvases = Array.from(
      el.querySelectorAll<HTMLCanvasElement>("canvas.s27-vid-a"),
    );
    const clStore = reduced ? null : mountFrameStore(el, ctx, CL_URLS);
    let clIndex = 0; // wanted frame (scrub-owned)
    const clPaint = () => {
      if (!clStore) return;
      for (const c of clCanvases) {
        const painted = Number(c.dataset.frame ?? -1);
        if (painted === clIndex) continue;
        if (!clStore.loaded[clIndex]) continue; // repainted via onLoad
        const g = c.getContext("2d");
        if (!g) continue;
        g.clearRect(0, 0, c.width, c.height);
        g.drawImage(clStore.frames[clIndex], 0, 0, c.width, c.height);
        c.dataset.frame = String(clIndex);
        c.parentElement!.classList.add("s27-live");
      }
    };
    clStore?.onLoad.add((i) => {
      if (i === clIndex) clPaint();
    });
    /* round 21: drag-to-scrub on top of the scroll drive — drag RIGHT
       plays forward, LEFT backward (client-specified, opposite of the
       diopter dial). The drag holds an additive frame offset; once the
       visitor scrolls again the offset eases back out so the scroll
       choreography (fade-out at CL_END) re-takes the exact design frame. */
    let clDrag = 0; // additive drag offset, fractional frames
    let clScrollIdx = 0;
    let clLastP = -1;
    const clApply = () => {
      clIndex = Math.max(
        0,
        Math.min(CL_FRAMES - 1, Math.round(clScrollIdx + clDrag)),
      );
      clPaint();
    };
    const clSync = (p: number) => {
      clScrollIdx = Math.max(
        0,
        Math.min(CL_FRAMES - 1, (p / CL_END) * (CL_FRAMES - 1)),
      );
      if (clLastP >= 0 && Math.abs(p - clLastP) > 0.0005 && clDrag !== 0) {
        // scroll moved: bleed the drag offset away over a few ticks
        clDrag *= 0.75;
        if (Math.abs(clDrag) < 0.5) clDrag = 0;
      }
      clLastP = p;
      clApply();
    };
    if (!reduced)
      for (const c of clCanvases) {
        let dragging = false;
        let lastX = 0;
        c.addEventListener("pointerdown", (e) => {
          dragging = true;
          lastX = e.clientX;
          try {
            c.setPointerCapture(e.pointerId);
          } catch {
            /* pointer already released */
          }
        });
        c.addEventListener("pointermove", (e) => {
          if (!dragging) return;
          clDrag += (e.clientX - lastX) / 9; // right = forward
          // clamp the ACCUMULATOR to the reachable range so a drag past
          // either end doesn't bank dead travel the visitor must re-drag
          // through before the frames respond again
          clDrag = Math.max(
            -clScrollIdx,
            Math.min(CL_FRAMES - 1 - clScrollIdx, clDrag),
          );
          lastX = e.clientX;
          clApply();
        });
        const end = () => (dragging = false);
        c.addEventListener("pointerup", end);
        c.addEventListener("pointercancel", end);
      }

    // Pinned finale (per breakpoint so matchMedia rebuilds cleanly):
    // rest plateau on the Classic hero (0–0.28); the A-copy rolls out
    // upward, the hero cross-blends into the "Five years" still underneath
    // (long soft fade, counter scale drift — no hard cut), then the B-copy
    // and the spec strip roll in from below — strictly sequential (A is
    // gone at 0.42 before B starts at 0.48); rest plateau from 0.7 so the
    // page ends calm on the exact Screen-28 frame. The offer bar is never
    // touched by the scrub — one object, anchored, start to finish.
    const mm = gsap.matchMedia();
    const build = (isMobile: boolean) => () => {
      const stage = el.querySelector<HTMLElement>(
        isMobile ? ".stage--m" : ".stage--d",
      )!;
      const q = (s: string) => stage.querySelectorAll<HTMLElement>(s);
      // the scrub owns the INNER hero group; the entrance owns the wrapper
      // (.s27-hero / .s27-hero-m) — separate elements, so the time-based
      // entrance and the scrubbed cross-blend can never write to the same
      // property (round 9: they used to share one element, and whichever
      // rendered last "won" the resting frame — a fast ride into the pin
      // rested as a double exposure the user couldn't scroll away).
      // round 19: the scrub owns the GROUP wrappers (img + alpha video
      // together) — .s27-hero-in / .s27-still-g — so the cross-blend clips
      // each state's video with its baked still in one write, and the
      // fallback imgs' opacity stays free for the .s27-live swap
      const heroSel = ".s27-hero-in";
      const stillSel = ".s27-still-g";
      const copyASel = isMobile ? ".s27-text-m" : ".s27-text";
      const flareSel = isMobile ? ".s27-flare--m" : ".s27-flare";
      const copyBSel = isMobile ? ".s27-title-b-m" : ".s27-title-b";
      const specsSel = isMobile ? ".s27-specs-m" : ".s27-specs";

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: isMobile ? "+=120%" : "+=180%",
          pin: true,
          scrub: 0.6,
          // the scrub owns the hero/still from here on — snap the entrance
          // to its end state so its time-based tweens can never fight the
          // scrubbed cross-blend (resting double-exposure bug, round 9)
          onEnter: () => void intro?.progress(1),
        },
        // immediateRender:true + built BEFORE the entrance (round 9): every
        // fromTo below inits at creation, while the elements still hold
        // their pristine CSS rest states — and those from-values EQUAL the
        // CSS rest states, so the creation-time render is a visual no-op.
        // With the previous lazy init (immediateRender:false), the children
        // initted during whatever refresh/scroll first forced a render —
        // by then the entrance had the hero at opacity 0, so that garbage
        // got recorded as the fromTos' revert state, and scrubbing back
        // above the pin "restored" an invisible hero on state A.
        defaults: { ease: "none", immediateRender: true },
      });
      // plain `opacity` on the copy layers (not autoAlpha) — their hidden
      // rest state lives in CSS as opacity only, and visibility toggles
      // would stick under the QA freeze (cf. s16b)
      tl.fromTo(
        q(copyASel),
        { opacity: 1, y: 0 },
        { opacity: 0, y: -56, duration: 0.14, ease: "power1.in" },
        0.28,
      )
        // client round 20: NO overlap — the classic pair is fully gone
        // (hero out by 0.42) before the anniversary still starts rising at
        // 0.46; the 0.42–0.46 beat is a clean dark field between states
        .fromTo(
          q(heroSel),
          { autoAlpha: 1, scale: 1, transformOrigin: "50% 50%" },
          { autoAlpha: 0, scale: 1.04, duration: 0.12, ease: "power1.in" },
          0.3,
        )
        .fromTo(
          q(stillSel),
          { autoAlpha: 0, scale: 1.06, transformOrigin: "50% 50%" },
          { autoAlpha: 1, scale: 1, duration: 0.18, ease: "power1.out" },
          0.46,
        )
        // the lens-flare crop inside the bar belongs to state A only (the
        // Screen-28 design bar carries no flare) — it rides the hero's
        // cross-blend window so the REAL glass shows the plain still in
        // state B instead of a baked state-A leftover (plain opacity, not
        // autoAlpha — visibility would stick under the QA freeze)
        .fromTo(
          q(flareSel),
          { opacity: 1 },
          { opacity: 0, duration: 0.12 },
          0.3,
        )
        .fromTo(
          q(copyBSel),
          { opacity: 0, y: 56 },
          { opacity: 1, y: 0, duration: 0.16, ease: "power1.out" },
          0.54,
        )
        .fromTo(
          q(specsSel),
          { opacity: 0, y: 32 },
          // rests at the design's 60% white — the roll lands on 0.6, not 1
          { opacity: 0.6, y: 0, duration: 0.14, ease: "power1.out" },
          0.62,
        )
        .to({}, { duration: 0.3 }, 0.7);
      // ---- finale-video trigger (round 19) ----
      // pure function of scrub progress, evaluated on every timeline write
      // (real scrolls, scrub catch-up, AND the QA harness's programmatic
      // progress(p) jump): forward crossing fires the one-shot reveal,
      // dropping back below B_OFF re-arms and parks it on transparent
      // frame 0 so state A can never see a stale held finale frame.
      const syncB = () => {
        const p = tl.progress();
        clSync(p); // classic frame follows the scrub — backwards included
        if (p >= B_ON && !bState.live) {
          bState.live = true;
          playFromStart(vidsB);
        } else if (p < B_OFF && bState.live) {
          bState.live = false;
          parkAtStart(vidsB);
        }
      };
      tl.eventCallback("onUpdate", syncB);
      syncB(); // breakpoint rebuild mid-pin: settle to the current progress
    };
    mm.add("(min-width: 641px)", build(false));
    mm.add("(max-width: 640px)", build(true));

    if (!qaFixed) {
      // Entrance — state-A targets and the persistent bar only. Created
      // AFTER the scrub so the scrub's revert states are pristine (see
      // above); the pin's onEnter force-completes it so its time-based
      // tweens can never fight the scrubbed cross-blend (cf. s03).
      intro = gsap
        .timeline({
          scrollTrigger: { trigger: el, start: "top 78%" },
          defaults: { ease: "power3.out" },
        })
        .from(el.querySelectorAll(".s27-hero, .s27-hero-m"), {
          opacity: 0,
          scale: 1.04,
          duration: 1,
          transformOrigin: "50% 50%",
        })
        .from(
          el.querySelectorAll(".s27-title, .s27-title-m"),
          { opacity: 0, y: 36, duration: 0.9, clearProps: "all" },
          0.15
        )
        .from(
          el.querySelectorAll(".s27-tagline, .s27-tagline-m"),
          { opacity: 0, y: 24, duration: 0.8, clearProps: "all" },
          0.27
        )
        .from(
          el.querySelectorAll(".s27-bottom, .s27-bottom-m"),
          { opacity: 0, y: 36, duration: 0.9 },
          0.36
        );
    }

    // ---- video load/arrival driver (round 19) ----
    if (reduced) {
      // poster-still mode: never fetch or play — the baked imgs carry both
      // states (cf. lib/lazyvideo reduced-motion contract)
      for (const v of allVids) {
        v.preload = "none";
        v.autoplay = false;
        v.removeAttribute("autoplay");
      }
    } else {
      let loaded = false;
      let wasVisible = false;
      const update = () => {
        const vh = window.innerHeight;
        const r = el.getBoundingClientRect();
        const near = r.bottom > -vh && r.top < vh * 2; // ±1 viewport preload
        const visible = r.bottom > 0 && r.top < vh;
        if (near && !loaded) {
          loaded = true;
          for (const v of allVids) {
            v.preload = "auto";
            v.load();
          }
        }
        if (visible && !wasVisible) {
          // fresh arrival: the classic (A) canvas needs no replay — it is
          // a pure function of scrub progress now; if the pin currently
          // rests in state B (e.g. a reload or return at the page
          // bottom), replay the finale reveal — "replay on fresh
          // re-arrivals"
          if (bState.live) playFromStart(vidsB);
        } else if (!visible && wasVisible) {
          // offscreen: suspend everything — re-entry replays from 0
          for (const v of allVids) if (!v.paused) v.pause();
        }
        wasVisible = visible;
      };
      // same rect-based listener trio as lib/lazyvideo (NOT
      // IntersectionObserver — see that module's header for why)
      ctx.lenis.on("scroll", update);
      window.addEventListener("scroll", update, { passive: true });
      ctx.ScrollTrigger.addEventListener("refresh", update);
      update();
    }
  },
};
