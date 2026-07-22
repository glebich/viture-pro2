import "./style.css";
import type { Section } from "../../lib/section";

/* s16b — merged pinned page (former s16b + s17, client round 5):
 * the blurred-glasses field persists (the Comfort still and the s17
 * product read as one family — a subtle cross-fade swaps them mid-pin)
 * while the copy does a clean sequential vertical roll: "The XR Glasses
 * Your Eyes / Will Actually Thank You for" + "Hour three. Still on."
 * rolls out upward, then "Sleek On Every Face, From Every Angle." rolls
 * in from below — never overlapping.
 */

const D = "/assets/1920_Screen-Comfort";
const D17 = "/assets/1920_Screen-17-01";
const M17 = "/assets/375_Screen-17-01";

export const s16b: Section = {
  id: "s16b",
  html: `
    <div class="stage stage--d">
      <div class="s16b-bg"></div>
      <img class="s16b-photo s16b-glasses-d s16b-photo-a" src="${D}/imgStillsIt322.webp" alt="VITURE Pro 2 glasses, front view" />
      <video class="s16b-photo s16b-glasses-d s16b-photo-b" muted playsinline preload="auto" poster="/video/sleek-poster.jpg" src="/video/sleek-seq.mp4" aria-hidden="true"></video>
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
      <img class="s16b-photo s16b-glasses-m s16b-photo-a" src="${D}/imgStillsIt322.webp" alt="VITURE Pro 2 glasses, front view" />
      <div class="s16b-photo s16b-glasses17-m s16b-photo-b">
        <video muted playsinline preload="auto" poster="/video/sleek-poster.jpg" src="/video/sleek-seq.mp4" aria-hidden="true"></video>
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
      // Only state-a targets — the pinned scrub owns .s16b-photo-b and the
      // .s16b-copy wrappers, and the two must never fight (cf. s03).
      // clearProps on the copy: the headline is gradient-clipped text and must
      // not keep an inline transform at rest (compositor-layer "ghost" hazard).
      ctx.gsap
        .timeline({ scrollTrigger: { trigger: el, start: "top 85%" } })
        .from(
          el.querySelectorAll(".s16b-photo-a"),
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

    // Scrubbed drift on the still while the section scrolls into place: it
    // starts slightly low (the gap it opens at its top edge sits inside the
    // mask fade) and settles at the design position when the pin engages.
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
    // the product cross-fades underneath, copy-b rolls in from below —
    // strictly sequential (a is gone AND visibility-clamped at 0.44 before
    // b starts at 0.5); rest plateau on "Sleek On Every Face" (0.66–1).
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
      // parked it INLINE on copy-a/photo-a — the whole first state
      // invisible at rest. Same mechanism as the s06 round-12 Safari
      // empty-card bug; same fix: gsap owns opacity/y only, and visibility
      // is a plain style write driven as a pure function of scrub progress
      // (proxy tween below), so a refresh dance always lands in the
      // correct state with nothing for gsap to snapshot or rewind.
      tl.fromTo(
        q(".s16b-copy-a"),
        { opacity: 1, y: 0 },
        { opacity: 0, y: -56, duration: 0.14, ease: "power1.in" },
        0.3,
      ).fromTo(
        q(".s16b-photo-b"),
        { opacity: 0 },
        { opacity: 1, duration: 0.3 },
        0.32,
      );
      if (isMobile) {
        // the two renders sit in different frames on mobile (full-bleed
        // still vs the smaller s17 product) — a one-way fade-in would
        // double-expose them, so retire the comfort still underneath
        tl.fromTo(
          q(".s16b-photo-a"),
          { opacity: 1 },
          { opacity: 0, duration: 0.3 },
          0.32,
        );
      }
      tl.fromTo(
        q(".s16b-copy-b"),
        { opacity: 0, y: 56 },
        { opacity: 1, y: 0, duration: 0.16, ease: "power1.out" },
        0.5,
      ).to({}, { duration: 0.34 }, 0.66);
      // ---- visibility driver (round-16 hunt) ----
      // Beat semantics preserved from round 8: copy-a paints only below
      // 0.44, copy-b only from 0.475 (gap ≥ 0.03 — the two can never paint
      // together, so neither can double-expose over the other via a stale
      // compositor layer); photo-b joins the compositor only once its fade
      // window opens; the mobile comfort still stops painting after its
      // fade-out completes. "inherit" (never "visible") so the stage-level
      // offscreen guards are never overridden.
      const copyA = q1(".s16b-copy-a");
      const copyB = q1(".s16b-copy-b");
      const photoA = q1(".s16b-photo-a");
      const photoB = q1(".s16b-photo-b");
      // round 17: the sleek-state bg is a 30fps one-shot PNG-sequence video —
      // restart it on each forward arrival at the state (client: "once you
      // scroll to this page it starts playing"), hold last frame after
      const vids = el.querySelectorAll<HTMLVideoElement>(".s16b-photo-b video, video.s16b-photo-b");
      let vidPlayedAt = -1;
      const playSeq = (p: number) => {
        if (p > 0.4 && vidPlayedAt <= 0.4) {
          vids.forEach((v) => {
            if (v.offsetParent !== null) { v.currentTime = 0; v.play().catch(() => {}); }
          });
        }
        vidPlayedAt = p;
      };
      const vis = { p: 0 };
      const applyVis = () => {
        const p = vis.p;
        copyA.style.visibility = p >= 0.44 ? "hidden" : "inherit";
        copyB.style.visibility = p >= 0.475 ? "inherit" : "hidden";
        photoB.style.visibility = p > 0.32 ? "inherit" : "hidden";
        playSeq(p);
        if (isMobile)
          photoA.style.visibility = p >= 0.62 ? "hidden" : "inherit";
      };
      tl.to(vis, { p: 1, duration: 1, ease: "none", onUpdate: applyVis }, 0);
      applyVis();
    };
    mm.add("(min-width: 641px)", build(false));
    mm.add("(max-width: 640px)", build(true));

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
