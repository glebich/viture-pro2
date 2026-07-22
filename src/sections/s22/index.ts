import "./style.css";
import type { Section } from "../../lib/section";
import { prepareText, revealText, scrubWordArrival } from "../../lib/textfx";

/* Asset dirs — shared constants (ellipse, glow, buttons) are referenced from
   one canonical copy; per-state product renders come from their own dirs. */
const A1 = "/assets/1920_Screen-22-01";
const A2 = "/assets/1920_Screen-22-02";
const A3 = "/assets/1920_Screen-22-03";
const A4 = "/assets/1920_Screen-22-04";
const A5 = "/assets/1920_Screen-22-05";
const AM = "/assets/375_Screen-22-01";

export const s22: Section = {
  id: "s22",
  html: `
  <div class="stage stage--d">
    <div class="s22-bg"></div>
    <div class="s22-horizon"><div class="s22-horizon-in"><img src="${A1}/imgEllipse1329130912.baked.webp" alt=""></div></div>
    <div class="s22-glow"><img src="${A1}/imgHeroStill000000021.webp" alt=""></div>
    <div class="s22-fold"></div>

    <div class="s22-img s22-img--1"><img src="${A1}/imgDock.webp" alt="Mobile Dock Mini"></div>
    <div class="s22-img s22-img--2"><img class="s22-cover" src="${A2}/img031.webp" alt="Dock on Switch"></div>
    <div class="s22-img s22-img--3"><img src="${A3}/imgMount011.webp" alt="Magnetic mount"></div>
    <div class="s22-img s22-img--4"><img class="s22-cover" src="${A4}/img071.webp" alt="Detachable adapter"></div>
    <div class="s22-img s22-img--5"><img class="s22-cover" src="${A5}/img091.webp" alt="Adapter with phone"></div>

    <div class="s22-copy s22-copy--1">
      <div class="s22-copytext">
        <h3 class="s22-headline gtx gtx--ink" style="width:568px">Mini. Mighty.<br>Always Ready.</h3>
        <p class="s22-sub">$99</p>
      </div>
    </div>
    <div class="s22-copy s22-copy--2">
      <div class="s22-copytext">
        <h3 class="s22-headline gtx gtx--ink" style="width:698px">Made for Switch &amp; Switch 2.</h3>
        <p class="s22-sub">Phone, Switch, and the dock itself — all charging at once.</p>
      </div>
    </div>
    <div class="s22-copy s22-copy--3">
      <div class="s22-copytext">
        <h3 class="s22-headline gtx gtx--ink" style="width:698px">Credit Card-Thin Magnetic Mount.</h3>
        <p class="s22-sub">Snap On &amp; Play</p>
      </div>
    </div>
    <div class="s22-copy s22-copy--4">
      <div class="s22-copytext">
        <h3 class="s22-headline gtx gtx--ink" style="width:698px">Detachable<br>Adapter.</h3>
        <p class="s22-sub">Two devices in one.</p>
      </div>
    </div>

    <p class="s22-counter s22-odo" aria-hidden="true"><span class="s22-odo-strip"><span>01</span><span>02</span><span>03</span><span>04</span></span></p>

    <div class="s22-collection">
      <div class="s22-collection-text">
        <p class="s22-label">Anniversary Collection</p>
        <p class="s22-title gtx gtx--ice">Pro Mobile Dock, Gone Mini.</p>
      </div>
      <button class="s22-learn" type="button">Learn More</button>
    </div>

    <div class="s22-anno">
      <div class="s22-anno-line"><img src="${A5}/imgLine.svg" alt=""></div>
      <p class="s22-anno-text">Charging Adapter — also supports Switch / Switch 2 gameplay with a power bank.</p>
    </div>

    <button class="s22-btn s22-btn--prev" type="button" aria-label="Previous slide">
      <img src="${A2}/imgButtonPrev.svg" alt="">
    </button>
    <button class="s22-btn s22-btn--next" type="button" aria-label="Next slide">
      <img class="s22-btn-skin s22-btn-skin--orange" src="${A1}/imgButtonNext.svg" alt="">
      <img class="s22-btn-skin s22-btn-skin--dark" src="${A2}/imgButtonNext.svg" alt="">
    </button>
  </div>

  <div class="stage stage--m">
    <div class="s22m-bg"></div>
    <div class="s22m-horizon"><div class="s22m-horizon-in"><img src="${AM}/imgEllipse1329130912.baked.webp" alt=""></div></div>
    <div class="s22m-glow"><img src="${AM}/imgHeroStill000000021.webp" alt=""></div>
    <div class="s22m-fold"></div>
    <div class="s22m-dock"><img src="${AM}/imgDock.webp" alt="Mobile Dock Mini"></div>
    <div class="s22m-copy">
      <p class="s22m-counter">01</p>
      <div class="s22m-copytext">
        <h3 class="s22m-headline gtx gtx--ink">Mini. Mighty.<br>Always Ready.</h3>
        <p class="s22m-price">$99</p>
      </div>
    </div>
    <div class="s22m-content">
      <div class="s22m-content-text">
        <p class="s22m-label">Anniversary Collection</p>
        <p class="s22m-title gtx gtx--ice">Pro Mobile Dock, Gone Mini.</p>
      </div>
      <button class="s22m-learn" type="button">Learn More</button>
    </div>
    <button class="s22m-next" type="button" aria-label="Next">
      <img src="${AM}/imgButtonNext.svg" alt="">
    </button>
  </div>`,

  init(el, ctx) {
    const { gsap } = ctx;
    const mm = gsap.matchMedia();

    // QA harness (?progress=…) forces every trigger's animation to a fixed
    // progress, which would freeze entrances mid-flight — skip them there.
    const qaProgress =
      import.meta.env.DEV && new URLSearchParams(location.search).has("progress");

    /* ---------- desktop: pinned, scrubbed 4-slide carousel + annotation ---------- */
    mm.add("(min-width: 641px)", () => {
      const d = el.querySelector<HTMLElement>(".stage--d")!;
      const $ = (sel: string) => d.querySelector<HTMLElement>(sel)!;
      const imgs = [1, 2, 3, 4, 5].map((i) => $(`.s22-img--${i}`));
      const copies = [1, 2, 3, 4].map((i) => $(`.s22-copy--${i}`));
      const odoStrip = $(".s22-odo-strip");
      const glow = $(".s22-glow");
      const anno = $(".s22-anno");
      const next = $(".s22-btn--next");
      const prev = $(".s22-btn--prev");
      const skinOrange = $(".s22-btn-skin--orange");
      const skinDark = $(".s22-btn-skin--dark");

      /* initial states */
      gsap.set(imgs.slice(1), { autoAlpha: 0 });
      gsap.set(copies.slice(1), { autoAlpha: 0 });
      gsap.set([anno, prev], { autoAlpha: 0 });
      gsap.set(skinDark, { opacity: 0 });

      /* fold feather: s21's bottom edge is solid #CEDAE3 while this stage
         opens on the horizon art's near-black sky. Client bug (r9): the
         veil used to stay fully opaque for the whole approach and melt
         inside the pin's opening plateau — every restable frame from
         mid-approach through the pin's FIRST frame put the ice/white
         chrome on a near-white veil field (unreadable) instead of the
         design's dark sky. Now it scrubs out across the approach itself
         (the mobile treatment): the ramp COMPRESSES upward (scaleY,
         origin top — every frame keeps its pure atmosphere colors and the
         solid #CEDAE3 top row stays glued to the seam against s21's light
         bottom) and only the last thin strip melts via alpha, finishing
         exactly at pin start. power3.out front-loads the compress so the
         veil has cleared the chrome zone (y<~500) by ~half the approach —
         before the chrome entrance below fades the text in. Hidden in the
         QA harness so frozen-progress rest poses match the design. */
      const fold = $(".s22-fold");
      if (qaProgress) gsap.set(fold, { autoAlpha: 0 });
      else
        gsap
          .timeline({
            defaults: { immediateRender: false },
            scrollTrigger: {
              trigger: el,
              start: "top bottom",
              end: "top top",
              scrub: true,
            },
          })
          .fromTo(
            fold,
            { scaleY: 1 },
            { scaleY: 0.14, duration: 1, ease: "power3.out" },
            0
          )
          .fromTo(
            fold,
            { autoAlpha: 1 },
            { autoAlpha: 0, duration: 0.3, ease: "power2.in" },
            0.7
          );

      /* entrance — only targets the scrub timeline never touches, so the two
         timelines cannot fight over start values. Starts at "top 45%": by
         then the approach-scrubbed veil above has cleared the chrome zone,
         so the ice text always fades in over the dark sky, never under the
         light veil. The pin's onEnter force-completes it (s27 pattern), so
         a fast fling can never land on the pin's first frame with the
         chrome mid-fade. */
      let intro: gsap.core.Timeline | null = null;
      if (!qaProgress) {
        // ambient text language (lib/textfx.ts): slide 1's headline words
        // condense in while the chrome soft-fades — the pin's onEnter
        // force-completes the whole timeline (revealText clearProps
        // included), so a fling still lands on fully assembled chrome
        const h1 = copies[0].querySelector<HTMLElement>(".s22-headline")!;
        const sub1 = copies[0].querySelector<HTMLElement>(".s22-sub")!;
        prepareText(h1, { y: 22 });
        prepareText(sub1, { mode: "block" });
        intro = gsap
          .timeline({ scrollTrigger: { trigger: el, start: "top 45%" } })
          .from(glow, { opacity: 0, duration: 1.2, ease: "sine.out" }, 0)
          .from($(".s22-collection"), { opacity: 0, y: 28, duration: 1.1, ease: "power2.out" }, 0.08)
          .add(revealText(h1), 0.12)
          .add(revealText(sub1), 0.6);
      }

      /* scrubbed master timeline: labels s0..s4 at integer positions,
         one unit per state transition (4 transitions -> end +=500%;
         125% travel per state compensates the wheelMultiplier: 1.25 in
         main.ts so each slide still takes a full "wheel-viewport" to cross).
         All tweens are fromTo + immediateRender:false so every scrub
         direction renders deterministically.

         Choreography per unit: rest plateau (0 -> .225), transition window
         (.225 -> .775, ~55% of travel), rest plateau (.775 -> 1). Inside the
         window the outgoing product fully exits left (accelerating, slight
         roll, opacity tail dying by +.25) BEFORE the incoming one decelerates
         in from the right (+.24 onwards) — the two are never simultaneously
         above ~8% opacity, so no double-product frame exists at any scrub
         position. Copy blocks roll vertically after the product leads, and
         the counter rolls odometer-style between them. */
      const T0 = 0.225; // plateau before each transition window
      const ODO = 28; // odometer line height (20px * 1.4)
      const tl = gsap.timeline({
        defaults: { ease: "none", immediateRender: false },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: "+=500%",
          pin: true,
          scrub: 0.6,
          /* chrome must be fully assembled on the pin's first frame even
             when a fling outruns the time-based entrance */
          onEnter: () => void intro?.progress(1),
        },
      });

      /* slide i -> i+1: strict exit-then-enter handoff */
      const slide = (i: number) => {
        const t = i + T0;
        tl.addLabel(`s${i}`, i)
          /* outgoing product: accelerates off left, slight roll, opacity tail */
          .fromTo(imgs[i], { x: 0, rotation: 0 }, { x: -420, rotation: -5, duration: 0.26, ease: "power2.in" }, t)
          .fromTo(imgs[i], { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.25, ease: "power1.in" }, t)
          /* incoming product: overshoot-free deceleration from the right */
          .fromTo(imgs[i + 1], { x: 420, rotation: 4 }, { x: 0, rotation: 0, duration: 0.31, ease: "power3.out" }, t + 0.24)
          .fromTo(imgs[i + 1], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18, ease: "power1.out" }, t + 0.24)
          /* copy roll: up + out, then up + in, trailing the product lead */
          .fromTo(copies[i], { y: 0, autoAlpha: 1 }, { y: -70, autoAlpha: 0, duration: 0.18, ease: "power2.in" }, t + 0.03)
          .fromTo(copies[i + 1], { y: 70, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.22, ease: "power3.out" }, t + 0.32)
          /* counter: odometer digit roll */
          .fromTo(odoStrip, { y: -ODO * i }, { y: -ODO * (i + 1), duration: 0.3, ease: "power2.inOut" }, t + 0.12);
        /* ambient roll-IN flavor (lib/textfx.ts): the incoming headline's
           words cascade inside the container's arrival window — the
           container fromTo above keeps owning sequencing/visibility */
        scrubWordArrival(
          tl,
          copies[i + 1].querySelector<HTMLElement>(".s22-headline")!,
          t + 0.32,
          { window: 0.22, y: 26 },
        );
      };
      slide(0);
      slide(1);
      slide(2);

      /* s3 -> s4: annotation sub-state of slide 4 (copy 04 + counter persist).
         Same sequential handoff, shorter travel — it is the same product
         gaining a phone, not a new slide. */
      const t3 = 3 + T0;
      tl.addLabel("s3", 3)
        .fromTo(imgs[3], { x: 0, rotation: 0 }, { x: -160, rotation: -2, duration: 0.26, ease: "power2.in" }, t3)
        .fromTo(imgs[3], { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.25, ease: "power1.in" }, t3)
        .fromTo(imgs[4], { x: 160 }, { x: 0, duration: 0.31, ease: "power3.out" }, t3 + 0.24)
        .fromTo(imgs[4], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18, ease: "power1.out" }, t3 + 0.24)
        .fromTo(next, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.15 }, t3)
        .fromTo(anno, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.2, ease: "power3.out" }, t3 + 0.42)
        .addLabel("s4", 4)
        /* spacer: keeps total duration exactly 4 so integer labels map to
           progress 0/.25/.5/.75/1 (arrow goTo + QA harness rely on it) */
        .to({}, { duration: T0 }, 4 - T0);

      /* next-arrow skin (orange on slide 1, ink afterwards) + prev arrival */
      tl.fromTo(skinOrange, { opacity: 1 }, { opacity: 0, duration: 0.3 }, T0)
        .fromTo(skinDark, { opacity: 0 }, { opacity: 1, duration: 0.3 }, T0)
        .fromTo(prev, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, T0);

      /* arrows drive the scroll position of the pinned timeline */
      const st = tl.scrollTrigger!;
      const goTo = (idx: number) => {
        const clamped = Math.max(0, Math.min(4, idx));
        const y = st.start + ((st.end - st.start) * clamped) / 4;
        const proxy = { y: ctx.lenis.scroll };
        gsap.to(proxy, {
          y,
          duration: 1.1,
          ease: "power2.inOut",
          onUpdate: () => ctx.lenis.scrollTo(proxy.y, { immediate: true }),
        });
      };
      const current = () => Math.round(tl.progress() * 4);
      const onNext = () => goTo(current() + 1);
      const onPrev = () => goTo(current() - 1);
      next.addEventListener("click", onNext);
      prev.addEventListener("click", onPrev);

      return () => {
        next.removeEventListener("click", onNext);
        prev.removeEventListener("click", onPrev);
      };
    });

    /* ---------- mobile: single state, entrance only ---------- */
    mm.add("(max-width: 640px)", () => {
      const m = el.querySelector<HTMLElement>(".stage--m")!;
      const $ = (sel: string) => m.querySelector<HTMLElement>(sel)!;

      /* fold feather — same light-to-light seam treatment as desktop; no
         pin on mobile, so the veil scrubs out across the approach itself.
         The ramp compresses upward (scaleY, origin top — its solid #CEDAE3
         top stays glued to the seam against s21's light bottom, colors stay
         pure at every frame) while a steeper-eased alpha melts the thin
         remainder, finishing exactly as the section reaches fullscreen.
         power3.out (r9, was power2.in) front-loads the compress so the veil
         clears the top chrome zone by ~half the approach — the ice text
         below must never fade in under the light veil. */
      const mFold = $(".s22m-fold");
      if (qaProgress) gsap.set(mFold, { autoAlpha: 0 });
      else {
        const mTl = gsap.timeline({
          defaults: { immediateRender: false },
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "top top",
            scrub: true,
          },
        });
        mTl
          .fromTo(
            mFold,
            { scaleY: 1 },
            { scaleY: 0.16, duration: 1, ease: "power3.out" },
            0
          )
          .fromTo(
            mFold,
            { autoAlpha: 1 },
            { autoAlpha: 0, duration: 0.35, ease: "power2.in" },
            0.65
          );
      }

      // ambient text language (lib/textfx.ts): dock + copy chrome soft-fade
      // while the headline words condense in and the price follows
      const mh = $(".s22m-headline");
      const mPrice = $(".s22m-price");
      prepareText(mh, { y: 20 });
      prepareText(mPrice, { mode: "block" });
      const mIntro = gsap
        .timeline({ scrollTrigger: { trigger: el, start: "top 78%" } })
        .from($(".s22m-glow"), { opacity: 0, duration: 1.2, ease: "sine.out" }, 0)
        .from($(".s22m-dock"), { opacity: 0, y: 34, duration: 1.2, ease: "power2.out" }, 0.12)
        .from($(".s22m-copy"), { opacity: 0, duration: 0.9, ease: "sine.out" }, 0.2)
        .from($(".s22m-next"), { opacity: 0, duration: 0.9, ease: "sine.out" }, 0.5);
      mIntro.add(revealText(mh), 0.3).add(revealText(mPrice), 0.8);

      /* the top chrome block sits in the veil's zone (y 112+): its entrance
         waits until the front-loaded compress above has cleared it, so the
         white/ice text only ever appears over the dark sky (r9) */
      gsap
        .timeline({ scrollTrigger: { trigger: el, start: "top 40%" } })
        .from($(".s22m-content"), { opacity: 0, y: 36, duration: 0.9, ease: "power3.out" }, 0);

      const btn = $(".s22m-next");
      const onNext = () => ctx.lenis.scrollTo("#s23", { duration: 1 });
      btn.addEventListener("click", onNext);
      return () => btn.removeEventListener("click", onNext);
    });
  },
};
