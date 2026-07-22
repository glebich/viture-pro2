import "./style.css";
import type { Section } from "../../lib/section";
import { mountLazyVideo } from "../../lib/lazyvideo";
import { scrubWordArrival } from "../../lib/textfx";

/* s14 — short pinned build (client round 6): the section used to scroll
 * past and get ignored, so the reader is now held for a beat. p0 is the
 * dark glasses-detail photo alone (settling scale 1.06→1); the headline
 * rises first, the hairline divider draws, then the three benefit columns
 * cascade in with distinct beats. p1 matches the Screen-14-01 composition.
 *
 * Round 9 ("Light Enough to Forget two times scrolled same text"): the
 * text sequence must be experienced exactly ONCE. Two mechanisms could
 * show it twice and both are closed here:
 *  1. The scrub used to run BOTH ways, so any upward correction across the
 *     pin range dismantled the composition and the next downward pass
 *     re-played the whole build (refresh-induced progress regressions —
 *     mobile URL-bar resizes, the s01 retirement refresh — rewound it the
 *     same way). The pin+scrub now drives a proxy and the real timeline
 *     only ever RATCHETS FORWARD to the furthest point reached: build
 *     during the pin, stays built, scrolls away.
 *  2. The headline is gradient-clipped text animated under a transform —
 *     the exact recipe that left a stale compositor layer of s16b's
 *     headline double-exposed over later sections (see s16b round 8).
 *     Same armor here: plain `opacity` tweens (autoAlpha would pin inline
 *     visibility:visible on the copy and defeat any stage-level hide), no
 *     resting inline transforms once built (clearProps), and a rect-based
 *     offscreen guard that stops the stages painting at all once the
 *     section has left the viewport.
 */

const D = "/assets/1920_Screen-14-01";
const M = "/assets/375_Screen-14-01";

/* Client round 12: the static glasses-detail photo is replaced by the
 * sh2-slow clip (same dark macro drift, now alive). The video element takes
 * the photo's exact cover placement and the pinned scrub's 1.06→1 settle;
 * lazy load/pause + poster + reduced-motion via lib/lazyvideo. */
const VIDEO = (poster: string) => `<video
        class="s14-bgv"
        autoplay
        muted
        playsinline
        preload="metadata"
        poster="${poster}"
        src="/video/sh2-slow.mp4"
        aria-hidden="true"
      ></video>`;

export const s14: Section = {
  id: "s14",
  html: `
    <div class="stage stage--d">
      <div class="s14-bg">${VIDEO("/video/sh2-poster.jpg")}</div>
      <div class="s14-content">
        <p class="s14-eyebrow">Premium Feeling</p>
        <h2 class="s14-title gtx gtx--warm">Light Enough to Forget</h2>
        <div class="s14-line"><img src="${D}/imgLine.svg" alt="" /></div>
        <div class="s14-benefits">
          <div class="s14-benefit s14-benefit--1">
            <p class="s14-bt">Ergonomically</p>
            <p class="s14-bd">Ergonomically perfect, 7 nose-pad sizes</p>
          </div>
          <div class="s14-benefit s14-benefit--2">
            <p class="s14-bt">All-day</p>
            <p class="s14-bd">No pressure points. Even on long-haul.</p>
          </div>
          <div class="s14-benefit s14-benefit--3">
            <p class="s14-bt">20% Lighter</p>
            <p class="s14-bd">Engineered to disappear the moment it touches your face.</p>
          </div>
        </div>
      </div>
      <p class="s14-stat gtx gtx--warm">63<span class="s14-stat-g">g</span></p>
    </div>
    <div class="stage stage--m">
      <div class="s14-mbg">${VIDEO("/video/sh2-poster.jpg")}</div>
      <div class="s14-content s14-content--m">
        <p class="s14-eyebrow">Premium Feeling</p>
        <h2 class="s14-title gtx gtx--warm">Light Enough<br />to Forget</h2>
        <div class="s14-line"><img src="${M}/imgLine.svg" alt="" /></div>
        <div class="s14-benefits">
          <div class="s14-benefit s14-benefit--1">
            <p class="s14-bt">Ergonomically</p>
            <p class="s14-bd">Ergonomically perfect, 7 nose-pad sizes</p>
          </div>
          <div class="s14-benefit s14-benefit--2">
            <p class="s14-bt">All-day</p>
            <p class="s14-bd">No pressure points.<br />Even on long-haul.</p>
          </div>
          <div class="s14-benefit s14-benefit--3">
            <p class="s14-bt">20% Lighter</p>
            <p class="s14-bd">Engineered to disappear the moment it touches your face.</p>
          </div>
        </div>
      </div>
      <p class="s14-stat gtx gtx--warm">63<span class="s14-stat-g">g</span></p>
    </div>
  `,
  init(el, ctx) {
    const { gsap, ScrollTrigger, lenis } = ctx;
    const mm = gsap.matchMedia();

    // QA harness freezes scrubbed timelines at a fixed progress; entrance
    // from-states would then stick, so skip them in that mode (cf. s03/s11).
    const qaFixed =
      import.meta.env.DEV &&
      new URLSearchParams(location.search).has("progress");

    const build = (isMobile: boolean) => () => {
      const stage = el.querySelector<HTMLElement>(
        isMobile ? ".stage--m" : ".stage--d",
      )!;
      const q = (s: string) => stage.querySelectorAll<HTMLElement>(s);
      const photo = q(".s14-bgv");
      const eyebrow = q(".s14-eyebrow");
      const title = q(".s14-title");
      const line = q(".s14-line");
      const b1 = q(".s14-benefit--1");
      const b2 = q(".s14-benefit--2");
      const b3 = q(".s14-benefit--3");
      const stat = q(".s14-stat");

      if (!qaFixed) {
        // entrance touches only the photo's OPACITY — every property the
        // pinned scrub owns (photo scale, all text alphas) is left alone
        // so the two can never fight (cf. s03/s11)
        gsap.from(photo, {
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 78%" },
        });
      }

      // Pinned build: rest plateau on the clean photo (0–0.1) while it
      // slowly settles (scale 1.06→1 across the whole scrub, CSS rests at
      // 1.06); the headline rises first, the hairline divider draws, then
      // the three benefit columns cascade in with distinct beats, and the
      // big 63g stat rises as the final beat; rest plateau on the full
      // composition (0.96–1) so p1 = the updated Screen-14-01.
      // Plain `opacity` (NOT autoAlpha): autoAlpha stamps inline
      // visibility:visible on the copy, which would override the stage-
      // level offscreen guard below (cf. s16b's "inherit, never visible").
      // The timeline is paused — the ratcheted scrub proxy drives it.
      const tl = gsap.timeline({
        paused: true,
        defaults: { ease: "none", immediateRender: false },
      });

      // Ambient text flavor inside the SAME ratchet windows (lib/textfx.ts):
      // the headline condenses in word by word (the container just unhides
      // and the words own the drift), the eyebrow/benefits keep their block
      // beats but ease power2.out with a softer drift. Beat positions and
      // the ratchet mechanics are unchanged.
      tl.fromTo(photo, { scale: 1.06 }, { scale: 1, duration: 0.9, ease: "power1.out" }, 0)
        // eyebrow's design opacity is 0.7 — tween to exactly that
        .fromTo(eyebrow, { opacity: 0, y: 30 }, { opacity: 0.7, y: 0, duration: 0.14, ease: "power2.out" }, 0.1)
        .fromTo(title, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.16)
        .fromTo(
          line,
          { opacity: 0, scaleX: 0, transformOrigin: "left center" },
          { opacity: 1, scaleX: 1, duration: 0.16 },
          0.36,
        )
        .fromTo(b1, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.16, ease: "power2.out" }, 0.5)
        .fromTo(b2, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.16, ease: "power2.out" }, 0.6)
        .fromTo(b3, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.16, ease: "power2.out" }, 0.7)
        // final beat (client round 10): the big 63g stat rises last, after
        // the benefit columns land — same easing family as the cascade
        .fromTo(stat, { opacity: 0, y: 44 }, { opacity: 1, y: 0, duration: 0.18, ease: "power2.out" }, 0.78);
      // headline word cascade across the old title window (0.16 → ~0.4)
      const titleWords = scrubWordArrival(tl, title[0], 0.16, {
        window: 0.26,
        y: 34,
      });
      // rest plateau to p=1 so the fold-out never clips the composition
      tl.to({}, { duration: 0.04 }, 0.96);

      // Build-once ratchet: the pin's scrub drives this proxy tween (so the
      // QA harness still finds a scrubbed animation to freeze), and the real
      // timeline only ever moves FORWARD to the furthest progress reached.
      // Scrolling back up leaves the composition standing instead of
      // dismantling it, and no refresh/rewind can ever re-play the build —
      // the text sequence is experienced exactly once. When the build first
      // lands, the copy's inline transforms are cleared (all identity by
      // then) so no gradient-clipped text rests on a live transform — the
      // stale-compositor-layer recipe behind s16b's round-8 ghosting.
      const texts = [eyebrow, title, line, b1, b2, b3, stat];
      let built = 0;
      const drive = { p: 0 };
      gsap.to(drive, {
        p: 1,
        duration: 1,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: isMobile ? "+=80%" : "+=120%",
          pin: true,
          scrub: 0.6,
        },
        onUpdate() {
          if (drive.p <= built) return;
          built = drive.p;
          tl.progress(built);
          if (built >= 1) {
            gsap.set(texts, { clearProps: "transform" });
            // headline words too — their reveal drift rides `top`
            // (paint-only), cleared once the build lands (same armor)
            if (titleWords.length)
              gsap.set(titleWords, { clearProps: "top" });
          }
        },
      });
    };

    mm.add("(min-width: 641px)", build(false));
    mm.add("(max-width: 640px)", build(true));

    // lazy load/play the sh2-slow background loop (poster + reduced-motion
    // handled inside; the pinned scrub keeps owning the 1.06→1 settle)
    mountLazyVideo(el, ctx, { playOnce: true });

    // Hard guard against the headline ghosting over later sections (same
    // pattern as s16b): whenever the section is fully outside the viewport,
    // hide its stages so nothing in it can paint or persist as a stale
    // compositor layer. Rect-based on purpose — immune to ScrollTrigger
    // position staleness — and scoped to the stages, not the section, so it
    // can't fight main.ts's WebKit cull.
    const stages = Array.from(el.querySelectorAll<HTMLElement>(":scope > .stage"));
    const guard = () => {
      const r = el.getBoundingClientRect();
      const off = r.bottom < 1 || r.top > window.innerHeight - 1;
      const want = off ? "hidden" : "";
      for (const st of stages) if (st.style.visibility !== want) st.style.visibility = want;
    };
    lenis.on("scroll", guard);
    window.addEventListener("scroll", guard, { passive: true });
    ScrollTrigger.addEventListener("refresh", guard);
    guard();
  },
};
