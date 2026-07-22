import "./style.css";
import type { Section } from "../../lib/section";
import { prepareText, revealText } from "../../lib/textfx";

/* s23 — typography interstitial on gradient SVG background.
 *
 * Client: "the gradient needs to show up SLOWLY once you land on this
 * page — not just be there as an image — and a bit of parallax effect."
 *
 * 1. Bloom-in: TIME-based (cf. s11/s15 — onEnter once → play, never
 *    scrubbed). When the section enters (top 75%) the wash emerges over
 *    ~2s (opacity 0→1) with a slow scale settle (1.08→1) so it reads as
 *    light blooming, not an image loading. The headline rises while the
 *    gradient is mid-bloom so the two feel orchestrated.
 * 2. Parallax: a subtle scrubbed drift on the wash layer (yPercent -5→5
 *    across the section's viewport traversal, scrub 0.6, transform-only)
 *    so the gradient slides slower than the content. The baked asset
 *    bleeds far past the frame on every side (desktop: 845px top / 354px
 *    bottom; mobile: 674px / 304px — vs a ±114px / ±90px drift), so no
 *    edge can ever show.
 *
 * Ghost armor: plain opacity only (never autoAlpha / visibility — those
 * are what refresh-rewinds park inline, cf. s16b), the bloom clears its
 * inline props on completion so the rest state is exactly the stylesheet
 * state, and nothing here touches visibility so the global offscreen
 * cull stays sole owner. prefers-reduced-motion: gradient simply
 * present — no bloom, no parallax.
 */

const AD = "/assets/1920_Screen-23-01";
const AM = "/assets/375_Screen-23-01";

export const s23: Section = {
  id: "s23",
  html: `
  <div class="stage stage--d">
    <div class="s23-bg"><img src="${AD}/img1920Screen2301.baked.webp" alt=""></div>
    <div class="s23-headwrap">
      <h2 class="s23-headline gtx gtx--peach">Made for the way you actually live.</h2>
    </div>
  </div>
  <div class="stage stage--m">
    <div class="s23m-bg"><img src="${AM}/img375Screen2301.baked.webp" alt=""></div>
    <div class="s23m-headwrap">
      <h2 class="s23m-headline gtx gtx--peach">Made for the way you actually live.</h2>
    </div>
  </div>`,

  init(el, ctx) {
    const { gsap, ScrollTrigger } = ctx;
    const mm = gsap.matchMedia();
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const build = (isMobile: boolean) => () => {
      const stage = el.querySelector<HTMLElement>(
        isMobile ? ".stage--m" : ".stage--d",
      )!;
      const pre = isMobile ? "s23m" : "s23";
      const bg = stage.querySelector<HTMLElement>(`.${pre}-bg`)!;
      const img = stage.querySelector<HTMLElement>(`.${pre}-bg img`)!;
      const headline = stage.querySelector<HTMLElement>(`.${pre}-headline`)!;

      // reduced motion: everything simply present at stylesheet rest
      if (reducedMotion) return;

      // ---- parallax drift (scrubbed) ----------------------------------
      // The wrapper (not the img — the bloom owns that transform) drifts
      // -5% → +5% of its own height across the section's full traversal,
      // i.e. the wash rises slower than the page. Transform-only; the
      // wrapper carries will-change: transform in the stylesheet.
      gsap.fromTo(
        bg,
        { yPercent: -5 },
        {
          yPercent: 5,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6,
          },
        },
      );

      // ---- bloom-in (time-based, plays once) --------------------------
      // Hidden state is written up-front with gsap.set (not a paused
      // fromTo) so the wash can never flash at full opacity in the sliver
      // of section visible before the top-75% beat. The headline uses the
      // ambient word-cascade (lib/textfx.ts) — its hidden state is plain
      // inline styles from prepareText, and revealText clears its own
      // props on completion. Bloom orchestration timing unchanged: the
      // words still start condensing at 0.7, mid-bloom.
      gsap.set(img, { opacity: 0, scale: 1.08 });
      prepareText(headline, { y: 26 });
      const tl = gsap.timeline({ paused: true });
      tl.to(img, { opacity: 1, duration: 2, ease: "sine.out" }, 0)
        .to(img, { scale: 1, duration: 2.4, ease: "power2.out" }, 0)
        .add(revealText(headline), 0.7)
        // settle to a clean rest: no inline leftovers (stylesheet state
        // already IS opacity 1 / no transform)
        .set(img, { clearProps: "opacity,transform" });

      ScrollTrigger.create({
        trigger: el,
        start: "top 75%",
        once: true,
        onEnter: () => tl.play(),
      });
    };

    mm.add("(min-width: 641px)", build(false));
    mm.add("(max-width: 640px)", build(true));
  },
};
