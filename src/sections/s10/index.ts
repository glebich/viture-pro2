import "./style.css";
import type { Section } from "../../lib/section";

/* s10 — pinned zoom-through moment (rebuilt per client review round 4):
 *   1. the motion-blurred "every" word art rests on the orange field
 *      with the big soft ellipse glow (10-01a)
 *   2. a LONG scrubbed pin (+=250% desktop) pushes the camera INTO the
 *      word — exponential scale toward a letter stroke at the viewport
 *      centre (transform-only, cf. s06's mask-zoom but no mask needed);
 *      as it passes through, a pre-baked blurred variant cross-fades in
 *      so the letterforms defocus like a lens travelling past focus
 *   3. mid-travel the field does a fluid gradient wash — the global
 *      ambient sits underneath (VIVID_ORANGE family) while an in-section
 *      warm veil breathes over the handoff, the state-b ellipse/glow
 *      cross-fade in, and the "Push Birdbath Clarity to a New Height"
 *      headline rises with a gentle scale-settle (10-01b)
 *   4. the end state rests calmly on the orange field so the release
 *      folds seamlessly into s11 (same orange family)
 */

const DA = "/assets/1920_Screen-10-01a";
const DB = "/assets/1920_Screen-10-01b";
const MA = "/assets/375_Screen-10-01a";
const MB = "/assets/375_Screen-10-01b";

const stage = (a: string, b: string) => `
  <div class="s10-bg">
    <div class="s10-fill"></div>
    <div class="s10-ellipse s10-ellipse--a"><div class="s10-ellipse-in"><img src="${a}/imgEllipse1329130914.baked.webp" alt=""></div></div>
    <div class="s10-ellipse s10-ellipse--b"><div class="s10-ellipse-in"><img src="${b}/imgEllipse1329130915.baked.webp" alt=""></div></div>
    <div class="s10-glow s10-glow--a"><img src="${a}/imgHeroStill000000022.webp" alt=""></div>
    <div class="s10-glow s10-glow--b"><img src="${b}/imgHeroStill000000021.webp" alt=""></div>
    <div class="s10-veil"></div>
  </div>
  <div class="s10-every"><div class="s10-every-clip">
    <img class="s10-img s10-img--sharp" src="${a}/imgText.webp" alt="every">
    <img class="s10-img s10-img--soft" src="${a}/imgText.blur.webp" alt="">
  </div></div>
  <div class="s10-head"><div class="s10-head-in gtx gtx--warm">Push Birdbath Clarity to a New Height</div></div>`;

const html = `
<div class="stage stage--d">${stage(DA, DB)}</div>
<div class="stage stage--m"><div class="s10-bgwrap">${stage(MA, MB)}</div></div>
`;

export const s10: Section = {
  id: "s10",
  html,
  init(el, ctx) {
    const { gsap } = ctx;
    const mm = gsap.matchMedia();

    const build = (stageSel: string, end: string, zoomMax: number) => () => {
      const stg = el.querySelector<HTMLElement>(stageSel)!;
      const q = (s: string) => stg.querySelector<HTMLElement>(s)!;
      const clip = q(".s10-every-clip");

      // Entrance. Skipped when the QA harness forces a fixed ?progress= —
      // it drives every ScrollTrigger animation to that progress, which
      // would leave these from-states applied (blank state A) at p=0.
      const qaFixed =
        import.meta.env.DEV &&
        new URLSearchParams(location.search).has("progress");
      if (!qaFixed) {
        gsap
          .timeline({ scrollTrigger: { trigger: el, start: "top 78%" } })
          .fromTo(
            q(".s10-ellipse--a"),
            { opacity: 0 },
            { opacity: 1, duration: 0.9, ease: "power2.out" },
            0,
          )
          .fromTo(
            q(".s10-glow--a"),
            { opacity: 0 },
            { opacity: 1, duration: 1, ease: "power2.out" },
            0.08,
          )
          .fromTo(
            q(".s10-every"),
            { opacity: 0, scale: 1.035 },
            { opacity: 1, scale: 1, duration: 1.1, ease: "power3.out" },
            0.12,
          );
      }

      // Pinned scrub — the long zoom-through. Perf: only transform+opacity
      // are ever animated (never filter — the defocus is a pre-baked blurred
      // variant cross-fade); force3D keeps the blurred/blended layers on
      // their own GPU textures for the whole scrub.
      //
      // The camera push is exponential (scale = zoomMax^p) so the zoom feels
      // like constant perceptual speed — slow, readable start; accelerating
      // dive through the letter stroke at the stage centre.
      const zoom = { p: 0 };
      const applyZoom = () =>
        gsap.set(clip, { scale: Math.pow(zoomMax, zoom.p) });

      gsap
        .timeline({
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end,
            pin: true,
            scrub: 0.6,
          },
          defaults: { ease: "none", force3D: true, immediateRender: false },
        })
        // 1. the zoom occupies the first ~60% of the long pin
        .fromTo(zoom, { p: 0 }, { p: 1, duration: 0.6, onUpdate: applyZoom }, 0)
        // 2. lens defocus — pre-baked blurred variant cross-fades in
        .fromTo(
          q(".s10-img--soft"),
          { opacity: 0 },
          { opacity: 1, duration: 0.28 },
          0.2,
        )
        // the fully-defocused streaks dissolve into the gradient wash
        .fromTo(clip, { opacity: 1 }, { opacity: 0, duration: 0.16 }, 0.46)
        // 3. fluid gradient wash — state-b ellipse/glow cross-fade while the
        //    warm veil breathes over the handoff (in, then back out so the
        //    end state matches the 10-01b field exactly)
        .fromTo(
          q(".s10-ellipse--b"),
          { opacity: 0 },
          { opacity: 1, duration: 0.34 },
          0.38,
        )
        .fromTo(q(".s10-glow--a"), { opacity: 1 }, { opacity: 0, duration: 0.34 }, 0.38)
        .fromTo(q(".s10-glow--b"), { opacity: 0 }, { opacity: 1, duration: 0.36 }, 0.4)
        .fromTo(
          q(".s10-veil"),
          { opacity: 0 },
          { opacity: 0.85, duration: 0.24, ease: "sine.in" },
          0.36,
        )
        .fromTo(
          q(".s10-veil"),
          { opacity: 0.85 },
          { opacity: 0, duration: 0.32, ease: "sine.out" },
          0.62,
        )
        .fromTo(
          q(".s10-veil"),
          { scale: 1.14 },
          { scale: 1, duration: 0.58, ease: "sine.out" },
          0.36,
        )
        // 4. headline rises with a gentle scale-settle, then a calm tail
        //    (0.92→1) rests on the orange field for the fold into s11
        .fromTo(
          q(".s10-head-in"),
          { opacity: 0 },
          { opacity: 1, duration: 0.26 },
          0.58,
        )
        .fromTo(
          q(".s10-head-in"),
          { y: 90, scale: 1.06 },
          { y: 0, scale: 1, duration: 0.34, ease: "power2.out" },
          0.58,
        );
    };

    mm.add("(min-width: 641px)", build(".stage--d", "+=250%", 8));
    mm.add("(max-width: 640px)", build(".stage--m", "+=150%", 6));
  },
};
