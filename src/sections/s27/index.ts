import "./style.css";
import type { Section } from "../../lib/section";

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

const desktop = `
  <div class="s27-hero"><img class="s27-bg" src="${AD}/img1920Screen2701.webp" alt=""></div>
  <img class="s27-still" src="${BD}/imgStillsIt322.webp" alt="">
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
  <div class="s27-hero-m">
    <img src="${AM}/imgHeroStill4000000024.webp" alt="">
  </div>
  <img class="s27-still-m" src="${BM}/imgStillsIt322.webp" alt="">
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
      // the scrub owns the INNER hero image; the entrance owns the wrapper
      // (.s27-hero / .s27-hero-m) — separate elements, so the time-based
      // entrance and the scrubbed cross-blend can never write to the same
      // property (round 9: they used to share one element, and whichever
      // rendered last "won" the resting frame — a fast ride into the pin
      // rested as a double exposure the user couldn't scroll away).
      const heroSel = isMobile ? ".s27-hero-m img" : ".s27-bg";
      const stillSel = isMobile ? ".s27-still-m" : ".s27-still";
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
        .fromTo(
          q(stillSel),
          { autoAlpha: 0, scale: 1.06, transformOrigin: "50% 50%" },
          { autoAlpha: 1, scale: 1, duration: 0.3 },
          0.32,
        )
        .fromTo(
          q(heroSel),
          { autoAlpha: 1, scale: 1, transformOrigin: "50% 50%" },
          { autoAlpha: 0, scale: 1.04, duration: 0.26 },
          0.36,
        )
        // the lens-flare crop inside the bar belongs to state A only (the
        // Screen-28 design bar carries no flare) — it rides the hero's
        // cross-blend window so the REAL glass shows the plain still in
        // state B instead of a baked state-A leftover (plain opacity, not
        // autoAlpha — visibility would stick under the QA freeze)
        .fromTo(
          q(flareSel),
          { opacity: 1 },
          { opacity: 0, duration: 0.26 },
          0.36,
        )
        .fromTo(
          q(copyBSel),
          { opacity: 0, y: 56 },
          { opacity: 1, y: 0, duration: 0.16, ease: "power1.out" },
          0.48,
        )
        .fromTo(
          q(specsSel),
          { opacity: 0, y: 32 },
          // rests at the design's 60% white — the roll lands on 0.6, not 1
          { opacity: 0.6, y: 0, duration: 0.14, ease: "power1.out" },
          0.56,
        )
        .to({}, { duration: 0.3 }, 0.7);
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
  },
};
