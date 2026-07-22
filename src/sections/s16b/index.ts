import "./style.css";
import type { Section } from "../../lib/section";
import { mountLazyVideo } from "../../lib/lazyvideo";

/* s16b — merged pinned page (former s16b + s17, client round 5):
 * ONE background for both states (client round 18): the sleek sequence
 * video is the sole imagery — it plays once as the section arrives
 * (during "The XR Glasses Your Eyes…") and holds its final frame through
 * the sleek state, while the copy does a clean sequential vertical roll:
 * "The XR Glasses Your Eyes / Will Actually Thank You for" + "Hour
 * three. Still on." rolls out upward, then "Sleek On Every Face, From
 * Every Angle." rolls in from below — never overlapping.
 *
 * The encode is design-registered: each source frame (transparent PNG,
 * glasses filling the render) is flattened over black FIRST (premultiplied-
 * correct — kills the gray straight-alpha halo the client flagged around
 * the nose pads), then scaled 0.825 and placed at (171,442) so the video's
 * 1920×1080 frame IS the 1920_Screen-17-01 design page. Desktop shows it
 * 1:1 at stage origin; mobile maps the same frame through the measured
 * 375-design transform (scale 0.265, offset −67/343). Poster = final frame
 * (reduced-motion / pre-play fallback shows the at-rest design still).
 */

export const s16b: Section = {
  id: "s16b",
  html: `
    <div class="stage stage--d">
      <div class="s16b-bg"></div>
      <video class="s16b-photo s16b-seq" muted playsinline preload="metadata" poster="/video/sleek-poster.jpg" src="/video/sleek-seq.mp4" aria-hidden="true"></video>
      <div class="s16b-copy s16b-copy-a">
        <h2 class="s16b-title s16b-title-d gtx gtx--peach">The XR Glasses Your Eyes <br class="s16b-br" />Will Actually Thank You for</h2>
        <p class="s16b-sub s16b-sub-d">Hour three. Still on.</p>
      </div>
      <div class="s16b-copy s16b-copy-b">
        <h2 class="s16b-title s16b-title-d gtx gtx--peach">Sleek On Every Face,<br />From Every Angle.</h2>
      </div>
    </div>
    <div class="stage stage--m">
      <div class="s16b-bg"></div>
      <div class="s16b-photo s16b-seq-m">
        <video muted playsinline preload="metadata" poster="/video/sleek-poster.jpg" src="/video/sleek-seq.mp4" aria-hidden="true"></video>
      </div>
      <div class="s16b-copy s16b-copy-a">
        <h2 class="s16b-title s16b-title-m gtx gtx--peach">The XR Glasses Your Eyes <br class="s16b-br" />Will Actually Thank You for</h2>
        <p class="s16b-sub s16b-sub-m">Hour three. Still on.</p>
      </div>
      <div class="s16b-copy s16b-copy-b">
        <h2 class="s16b-title s16b-title-m gtx gtx--peach">Sleek On Every Face,<br />From Every Angle.</h2>
      </div>
    </div>`,
  init(el, ctx) {
    const { gsap } = ctx;

    // QA harness freezes scrubbed timelines at a fixed progress; entrance
    // from-states would then stick, so skip them in that mode (cf. s03/s10).
    const qaFixed =
      import.meta.env.DEV &&
      new URLSearchParams(location.search).has("progress");

    if (!qaFixed) {
      // Entrance starts earlier (top 85%) with a slower opacity ramp so the
      // imagery and copy are already breathing in while the fold scrolls
      // through, instead of popping in late against the near-black field.
      // The video bg is entrance-only territory now — the pinned scrub no
      // longer touches its opacity (single bg for both states), so the two
      // can't fight (cf. s03).
      // clearProps on the copy: the headline is gradient-clipped text and must
      // not keep an inline transform at rest (compositor-layer "ghost" hazard).
      ctx.gsap
        .timeline({ scrollTrigger: { trigger: el, start: "top 85%" } })
        .from(
          el.querySelectorAll(".s16b-photo"),
          { opacity: 0, scale: 1.04, duration: 1.2, ease: "power2.out" },
          0
        )
        .from(
          el.querySelectorAll(".s16b-copy-a .s16b-title"),
          { opacity: 0, y: 36, duration: 1.2, ease: "power3.out", clearProps: "all" },
          0.15
        )
        .from(
          el.querySelectorAll(".s16b-copy-a .s16b-sub"),
          { opacity: 0, y: 36, duration: 1.2, ease: "power3.out", clearProps: "all" },
          0.3
        );
    }

    // Scrubbed drift on the video bg while the section scrolls into place: it
    // starts slightly low and settles at the design position when the pin
    // engages.
    ctx.gsap.fromTo(
      el.querySelectorAll(".s16b-photo"),
      { yPercent: 4 },
      {
        yPercent: 0,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "top top", scrub: 0.6 },
      }
    );

    // Pinned copy roll (per breakpoint so matchMedia rebuilds cleanly):
    // rest plateau on the comfort read (0–0.3); copy-a rolls out upward,
    // copy-b rolls in from below — strictly sequential (a is gone AND
    // visibility-clamped at 0.44 before b starts at 0.5); rest plateau on
    // "Sleek On Every Face" (0.66–1). The background video is NOT part of
    // this scrub — it plays once on section arrival (lazyvideo below) and
    // holds its last frame under both copy states.
    const mm = gsap.matchMedia();
    const build = (isMobile: boolean) => () => {
      const stage = el.querySelector<HTMLElement>(
        isMobile ? ".stage--m" : ".stage--d",
      )!;
      const q = (s: string) => stage.querySelectorAll<HTMLElement>(s);
      const q1 = (s: string) => stage.querySelector<HTMLElement>(s)!;
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: isMobile ? "+=100%" : "+=150%",
          pin: true,
          scrub: 0.6,
        },
        defaults: { ease: "none", immediateRender: false },
      });
      // plain `opacity` EVERYWHERE in this scrub (never autoAlpha, never a
      // visibility fromTo). Root cause of the mobile-hunt "black comfort
      // page": ScrollTrigger.refresh() force-renders scrubbed timelines
      // end->back and finally rewinds each fromTo to the element's
      // PRE-TWEEN COMPUTED value recorded at first render (gsap
      // `_rewindStartAt`). This section's own offscreen guard (below) holds
      // the stages `visibility: hidden` at load on EVERY browser, so any
      // gsap-owned visibility (autoAlpha included) recorded "hidden" and
      // parked it INLINE on the first state — invisible at rest. Same
      // mechanism as the s06 round-12 Safari empty-card bug; same fix:
      // gsap owns opacity/y only, and visibility is a plain style write
      // driven as a pure function of scrub progress (proxy tween below),
      // so a refresh dance always lands in the correct state with nothing
      // for gsap to snapshot or rewind.
      tl.fromTo(
        q(".s16b-copy-a"),
        { opacity: 1, y: 0 },
        { opacity: 0, y: -56, duration: 0.14, ease: "power1.in" },
        0.3,
      ).fromTo(
        q(".s16b-copy-b"),
        { opacity: 0, y: 56 },
        { opacity: 1, y: 0, duration: 0.16, ease: "power1.out" },
        0.5,
      ).to({}, { duration: 0.34 }, 0.66);
      // ---- visibility driver (round-16 hunt) ----
      // Beat semantics preserved from round 8: copy-a paints only below
      // 0.44, copy-b only from 0.475 (gap ≥ 0.03 — the two can never paint
      // together, so neither can double-expose over the other via a stale
      // compositor layer). "inherit" (never "visible") so the stage-level
      // offscreen guards are never overridden.
      const copyA = q1(".s16b-copy-a");
      const copyB = q1(".s16b-copy-b");
      const vis = { p: 0 };
      const applyVis = () => {
        const p = vis.p;
        copyA.style.visibility = p >= 0.44 ? "hidden" : "inherit";
        copyB.style.visibility = p >= 0.475 ? "inherit" : "hidden";
      };
      tl.to(vis, { p: 1, duration: 1, ease: "none", onUpdate: applyVis }, 0);
      applyVis();
    };
    mm.add("(min-width: 641px)", build(false));
    mm.add("(max-width: 640px)", build(true));

    // round 18: the one-shot 30fps sequence video is the single background
    // for BOTH copy states — play once per fresh viewport entry (it is
    // already alive while "The XR Glasses…" fades in), hold the final frame
    // through "Sleek On Every Face"; poster/reduced-motion shows the at-rest
    // final-frame still (same playOnce lifecycle as the s14 sh2 drift).
    mountLazyVideo(el, ctx, { playOnce: true });

    // Hard guard against the headline ghosting over later sections: whenever
    // the section is fully outside the viewport, hide its stages so nothing
    // in it can paint (or persist as a stale compositor layer). Rect-based on
    // purpose — immune to ScrollTrigger position staleness — and scoped to
    // the stages, not the section, so it can't fight main.ts's WebKit cull.
    const stages = Array.from(el.querySelectorAll<HTMLElement>(":scope > .stage"));
    const guard = () => {
      const r = el.getBoundingClientRect();
      const off = r.bottom < 1 || r.top > window.innerHeight - 1;
      const want = off ? "hidden" : "";
      for (const st of stages) if (st.style.visibility !== want) st.style.visibility = want;
    };
    ctx.lenis.on("scroll", guard);
    window.addEventListener("scroll", guard, { passive: true });
    ctx.ScrollTrigger.addEventListener("refresh", guard);
    guard();
  },
};
