import "./style.css";
import type { Section } from "../../lib/section";
import { mountLazyVideo } from "../../lib/lazyvideo";
import { prepareText, revealText, scrubWordArrival } from "../../lib/textfx";

/* Backdrop is identical across the three states — referenced once from -01.
   The center media render differs per state. */
const A1 = "/assets/1920_Screen-24-01";
const AM = "/assets/375_Screen-24-01";

/* Client (TV round): the three media cards hold LOOPING videos instead of
   stills — re-encoded at exactly 1002×480, the card's design-pixel size, so
   cover = 1:1 mapping with zero scaling. The card container keeps the black
   underlay + object-bottom crop of the still era; all transforms/clip-paths
   stay on .s24-media-item, never on the <video>. Posters are the clips'
   first frames (prefers-reduced-motion shows them via lazyvideo). */
const tv = (name: string, label: string) =>
  `<video class="s24-video" muted loop playsinline preload="metadata" poster="/video/tv-${name}-poster.jpg" src="/video/tv-${name}.mp4" aria-label="${label}"></video>`;

export const s24: Section = {
  id: "s24",
  html: `
  <div class="stage stage--d">
    <div class="s24-bg"></div>
    <div class="s24-backdrop"><img src="${A1}/imgImage6347543.webp" alt=""></div>
    <div class="s24-glow"></div>
    <div class="s24-media">
      <div class="s24-media-item s24-media-item--1">${tv("gaming", "Gaming on TV")}</div>
      <div class="s24-media-item s24-media-item--2">${tv("entertainment", "Movie on TV")}</div>
      <div class="s24-media-item s24-media-item--3">${tv("productivity", "Coding on TV")}</div>
    </div>
    <div class="s24-text s24-text--1">
      <h3 class="s24-headline gtx gtx--peach">Gaming</h3>
      <p class="s24-sub">Single Switch 2 Gaming on the Mobile Dock Mini</p>
    </div>
    <div class="s24-text s24-text--2">
      <h3 class="s24-headline gtx gtx--peach">Entertainment</h3>
      <p class="s24-sub">Binge-Watching on Airplane While Charging</p>
    </div>
    <div class="s24-text s24-text--3">
      <h3 class="s24-headline gtx gtx--peach">Productivity</h3>
      <p class="s24-sub">Vibe Coding in Action</p>
    </div>
  </div>

  <div class="stage stage--m">
    <div class="s24m-bg"></div>
    <div class="s24m-backdrop"><img src="${AM}/imgImage6347543.webp" alt=""></div>
    <div class="s24m-media">${tv("gaming", "Gaming on TV")}</div>
    <div class="s24m-text">
      <h3 class="s24m-headline gtx gtx--peach">Gaming</h3>
      <p class="s24m-sub">Single Switch 2 Gaming on the Mobile Dock Mini</p>
    </div>
  </div>`,

  init(el, ctx) {
    const { gsap } = ctx;
    const mm = gsap.matchMedia();

    // QA harness (?progress=…) forces every trigger's animation to a fixed
    // progress, which would freeze entrances mid-flight — skip them there.
    const qaProgress =
      import.meta.env.DEV && new URLSearchParams(location.search).has("progress");

    /* Card-video playback gating: lazyvideo owns proximity load + the
       display:none-breakpoint check; on top of that a desktop card video
       only plays while its .s24-media-item is un-retired. The scrub
       timeline drives autoAlpha, so `visibility` is the exact "covered"
       bit: the incoming card unhides (and starts playing) as its reveal
       begins, the outgoing one goes visibility:hidden (and pauses) the
       moment it is fully covered. The mobile video has no media-item
       ancestor — always gate-open, plain proximity behavior. Mounted after
       mm.add so the initial gsap.set() hides cards 2/3 before the first
       gate evaluation; the scrub timeline's onUpdate re-runs the tick so
       scrub catch-up after the last scroll event still settles playback. */
    let syncVideos: () => void = () => {};

    /* ---------- desktop: pinned, scrubbed 3-state use-case carousel ---------- */
    mm.add("(min-width: 641px)", () => {
      const d = el.querySelector<HTMLElement>(".stage--d")!;
      const $ = (sel: string) => d.querySelector<HTMLElement>(sel)!;
      const media = [1, 2, 3].map((i) => $(`.s24-media-item--${i}`));
      const texts = [1, 2, 3].map((i) => $(`.s24-text--${i}`));
      const glow = $(".s24-glow");

      /* initial states — hidden cards also start pre-masked/pre-scaled so the
         alpha snap can never show an unclipped card before its reveal tween
         initializes (immediateRender:false renders from-values lazily) */
      gsap.set(media.slice(1), { autoAlpha: 0, clipPath: "inset(50% 50%)", scale: 0.94 });
      gsap.set(texts.slice(1), { autoAlpha: 0 });
      gsap.set(glow, { autoAlpha: 0 });

      /* entrance — only targets the scrub timeline never touches */
      if (!qaProgress)
        gsap
          .timeline({ scrollTrigger: { trigger: el, start: "top 78%" } })
          .from($(".s24-backdrop"), { opacity: 0, scale: 1.04, duration: 0.9, ease: "power3.out" }, 0)
          .from($(".s24-media"), { opacity: 0, y: 36, duration: 0.9, ease: "power3.out" }, 0.12);

      /* scrubbed master timeline: 2 transitions -> end +=200%.
         All tweens fromTo + immediateRender:false for deterministic scrub.

         Choreography per unit: rest plateau (0 -> .225), transition window
         (.225 -> .775, ~55% of travel), plateau after. Instead of a
         cross-fade, the incoming card — always FULLY opaque and stacked on
         top (later DOM sibling) — depth-pushes from scale .94 behind a
         center-out clip-path mask while the outgoing card recedes to .97
         and dims to black underneath. No frame ever shows two translucent
         cards over each other. Text groups roll vertically like s22. */
      const T0 = 0.225; // plateau before each transition window
      const tl = gsap.timeline({
        defaults: { ease: "none", immediateRender: false },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: "+=200%",
          pin: true,
          scrub: 0.6,
        },
      });

      /* state i -> i+1: masked depth-push handoff */
      const push = (i: number) => {
        const t = i + T0;
        tl.addLabel(`t${i}`, i)
          /* outgoing card recedes + dims to black under the incoming one */
          .fromTo(media[i], { scale: 1, filter: "brightness(1)" }, { scale: 0.97, filter: "brightness(0)", duration: 0.3, ease: "power1.in" }, t)
          /* incoming card: unhide instantly (still zero-area mask), then
             scale from .94 with a center-out clip reveal at full opacity */
          .fromTo(media[i + 1], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.02 }, t + 0.04)
          .fromTo(media[i + 1], { clipPath: "inset(50% 50%)", scale: 0.94 }, { clipPath: "inset(0% 0%)", scale: 1, duration: 0.38, ease: "power3.out" }, t + 0.08)
          /* outgoing is fully covered once the mask is open — retire it */
          .fromTo(media[i], { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.02 }, t + 0.46)
          /* text roll: up + out, then up + in, trailing the card */
          .fromTo(texts[i], { y: 0, autoAlpha: 1 }, { y: -40, autoAlpha: 0, duration: 0.18, ease: "power2.in" }, t + 0.02)
          .fromTo(texts[i + 1], { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.22, ease: "power3.out" }, t + 0.3);
        /* ambient roll-IN flavor (lib/textfx.ts): headline + sub words
           cascade as one flow inside the container's arrival window — the
           container fromTo above keeps owning sequencing/visibility */
        scrubWordArrival(tl, texts[i + 1], t + 0.3, { window: 0.26, y: 22 });
      };
      push(0); /* Gaming -> Entertainment */
      push(1); /* Entertainment -> Productivity */

      /* green #62B91A glow breathes in AFTER the Entertainment card lands
         (card mask opens by t0+.685), and leaves early on the way out */
      tl.fromTo(glow, { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.28, ease: "power2.out" }, T0 + 0.48)
        .fromTo(glow, { autoAlpha: 1, scale: 1 }, { autoAlpha: 0, scale: 0.96, duration: 0.25, ease: "power1.in" }, 1 + T0)
        .addLabel("t2", 2)
        /* spacer: keeps total duration exactly 2 so integer labels map to
           progress 0/.5/1 (QA harness relies on it) */
        .to({}, { duration: T0 }, 2 - T0);

      /* every scrub frame re-settles card-video play/pause (see gate note) */
      tl.eventCallback("onUpdate", () => syncVideos());
      return () => tl.eventCallback("onUpdate", null);
    });

    /* ---------- mobile: single state (Gaming), entrance only ---------- */
    mm.add("(max-width: 640px)", () => {
      const m = el.querySelector<HTMLElement>(".stage--m")!;
      const $ = (sel: string) => m.querySelector<HTMLElement>(sel)!;
      // ambient text language (lib/textfx.ts): headline words condense in,
      // the sub follows as a soft block fade
      const mh = $(".s24m-headline");
      const ms = $(".s24m-sub");
      prepareText(mh, { y: 20 });
      prepareText(ms, { mode: "block" });
      const mTl = gsap
        .timeline({ scrollTrigger: { trigger: el, start: "top 78%" } })
        .from($(".s24m-backdrop"), { opacity: 0, scale: 1.04, duration: 1.3, ease: "sine.out" }, 0)
        .from($(".s24m-media"), { opacity: 0, y: 32, duration: 1.2, ease: "power2.out" }, 0.12);
      mTl.add(revealText(mh), 0.3).add(revealText(ms), 0.75);
    });

    syncVideos = mountLazyVideo(el, ctx, {
      gate: (v) => {
        const item = v.closest<HTMLElement>(".s24-media-item");
        return !item || getComputedStyle(item).visibility !== "hidden";
      },
    });
  },
};
