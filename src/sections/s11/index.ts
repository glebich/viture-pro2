import "./style.css";
import type { Section } from "../../lib/section";

/* s11 — merged page (former s11 + s12, client round 5; unpinned round 8):
 * one "Edge-to-Edge Sharpness" hero scene; the diopter callout line draws
 * out of the dial and the "0 to -5.0D" stat + SGS Eye Care block (former
 * s12) rise in. The scene's video frame / bloom still / glow each
 * cross-fade to the s12 render (the dial gains its "-5D" markings, the
 * bloom brightens) so pre-build matches Screen-11-01 and the built state
 * matches Screen-12-01 exactly.
 *
 * Client round 8: "this element should show up automatically without
 * scrolling" — the section is a normal 100vh screen again (no pin), and
 * the build is TIME-based (cf. s15): a one-way ~3.6s timeline that plays
 * once when the section enters the viewport (top 60%) and stays built.
 * No loop, no reverse on leave — re-entering finds it already built.
 */

const D11 = "/assets/1920_Screen-11-01";
const D12 = "/assets/1920_Screen-12-01";
const MA = "/assets/375_Screen-11-01a";
const MB = "/assets/375_Screen-11-01b";

/* mobile scene pan between the two designs: the video container sits at
 * inset-top 20.2% in state a and 3.2% in state b → pure translateY */
const M_VIDEO_DY = -((0.202 - 0.032) * 812); // -138.04px

export const s11: Section = {
  id: "s11",
  html: `
    <div class="stage stage--d">
      <div class="s11-bg"></div>
      <div class="s11-glow">
        <div class="s11-glow-in">
          <img class="s11-a" src="${D11}/imgEllipse1329130912.baked.webp" alt="" />
          <img class="s11-b" src="${D12}/imgEllipse1329130913.baked.webp" alt="" />
        </div>
      </div>
      <div class="s11-still s11-still--a s11-a"><img src="${D11}/imgHeroStill000000021.webp" alt="" /></div>
      <div class="s11-still s11-still--b s11-b"><img src="${D12}/imgHeroStill000000022.webp" alt="" /></div>
      <div class="s11-video">
        <video muted playsinline preload="auto" aria-hidden="true">
          <source src="/video/diopter-glasses-hevc.mov" type="video/quicktime" />
          <source src="/video/diopter-glasses.webm" type="video/webm" />
        </video>
      </div>
      <div class="s11-text">
        <p class="s11-eyebrow">Built-in Diopter</p>
        <h2 class="s11-title gtx gtx--warm">Edge-to-Edge Sharpness.<br />Adjusted for Every Pair of Eyes.</h2>
        <p class="s11-sub">The optics let focus shift naturally from center to edge</p>
      </div>
      <div class="s11-line"><img src="${D12}/imgLine.svg" alt="" /></div>
      <div class="s11-info">
        <p class="s11-stat gtx gtx--warm">0 to -5.0D</p>
        <div class="s11-sgs">
          <img class="s11-sgs-logo" src="${D12}/imgLogo1.svg" alt="SGS" />
          <div class="s11-sgs-text">
            <p class="s11-sgs-title">SGS Eye Care Certified</p>
            <p class="s11-sgs-sub">Low blue light &middot; Flicker-free &middot; Low visual fatigue.</p>
          </div>
        </div>
      </div>
    </div>
    <div class="stage stage--m">
      <div class="s11-bg"></div>
      <div class="s11-glow s11-glow--m">
        <div class="s11-glow-in">
          <img class="s11-a" src="${MA}/imgEllipse1329130912.baked.webp" alt="" />
          <img class="s11-b" src="${MB}/imgEllipse1329130912.baked.webp" alt="" />
        </div>
      </div>
      <div class="s11-still s11-still--m">
        <img class="s11-a" src="${MA}/imgHeroStill000000021.webp" alt="" />
        <img class="s11-b" src="${MB}/imgHeroStill000000021.webp" alt="" />
      </div>
      <div class="s11-video s11-video--m">
        <video muted playsinline preload="auto" aria-hidden="true">
          <source src="/video/diopter-glasses-hevc.mov" type="video/quicktime" />
          <source src="/video/diopter-glasses.webm" type="video/webm" />
        </video>
      </div>
      <div class="s11-text s11-text--m">
        <p class="s11-eyebrow">Built-in Diopter</p>
        <h2 class="s11-title gtx gtx--warm">Edge-to-Edge Sharpness. Adjusted for Every Pair of Eyes.</h2>
        <p class="s11-sub">The optics let focus shift naturally from center to edge</p>
      </div>
      <div class="s11-vline"><img src="${MB}/imgLine.svg" alt="" /></div>
      <div class="s11-info s11-info--m">
        <p class="s11-stat gtx gtx--warm">0 to -5.0D</p>
        <div class="s11-sgs">
          <img class="s11-sgs-logo" src="${MB}/imgLogo1.svg" alt="SGS" />
          <div class="s11-sgs-text">
            <p class="s11-sgs-title">SGS Eye Care Certified</p>
            <p class="s11-sgs-sub">Low blue light &middot; Flicker-free &middot; Low visual fatigue.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  init(el, ctx) {
    const { gsap, ScrollTrigger } = ctx;
    const mm = gsap.matchMedia();

    // QA harness (?progress=p): the build is time-based now, so the
    // harness's scrub-freeze doesn't reach it — freeze it ourselves
    // (p=0 → pre-build hero, p=1 → fully built read-out). Entrances are
    // skipped in that mode so their from-states can't stick (cf. s15).
    const qaProgress = (() => {
      if (!import.meta.env.DEV) return null;
      const raw = new URLSearchParams(location.search).get("progress");
      if (raw === null) return null;
      const p = parseFloat(raw);
      return Number.isNaN(p) ? null : p;
    })();

    const build = (isMobile: boolean) => () => {
      const stage = el.querySelector<HTMLElement>(
        isMobile ? ".stage--m" : ".stage--d",
      )!;
      const q = (s: string) => stage.querySelectorAll<HTMLElement>(s);
      const aLayers = q(".s11-a");
      const bLayers = q(".s11-b");
      const video = q(".s11-video");
      // round 17: the glasses render is a delivered TRANSPARENT one-shot
      // video over the orange field (HEVC-alpha .mov source for Safari,
      // VP9-alpha .webm for Chromium) — plays once on the section's
      // existing onEnter, then holds its last frame (no loop)
      const vids = stage.querySelectorAll<HTMLVideoElement>(".s11-video video");
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const line = q(isMobile ? ".s11-vline" : ".s11-line");
      const stat = q(".s11-stat");
      const sgs = q(".s11-sgs");

      if (qaProgress === null) {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: el, start: "top 78%" },
          defaults: { ease: "power3.out", duration: 0.9 },
        });
        // entrance touches only the video CONTAINER's opacity/scale + text
        // lines — every element the build owns (the .s11-a/.s11-b layers,
        // the video's y pan, line, stat, SGS) is left alone so the two can
        // never fight (cf. s03/s15)
        tl.from(video, { opacity: 0, scale: 1.04, duration: 1 }, 0)
          .from(q(".s11-eyebrow"), { opacity: 0, y: 36 }, 0.12)
          .from(q(".s11-title"), { opacity: 0, y: 36 }, 0.22)
          .from(q(".s11-sub"), { opacity: 0, y: 36 }, 0.32);
      }

      // Time-based diopter read-out (client round 8 — no scroll input):
      // the scene's video/still/glow cross-fade to the s12 frame (mobile
      // also pans the scene up to the b framing), the callout line draws
      // from the dial, then the stat and the SGS block rise in. One-way
      // ~3.6s; plays once and stays built. Pre-build states come from CSS
      // (.s11-b / line / stat / SGS all rest hidden) + fromTo tweens, so
      // the paused timeline needs no scrub to hold p=0.
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(
        bLayers,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 1.3, ease: "power2.inOut" },
        0,
      ).fromTo(
        aLayers,
        { autoAlpha: 1 },
        { autoAlpha: 0, duration: 1.3, ease: "power2.inOut" },
        0,
      );
      if (isMobile) {
        // the b design frames the dial higher — pan the scene up with it
        tl.fromTo(
          video,
          { y: 0 },
          { y: M_VIDEO_DY, duration: 1.4, ease: "power2.inOut" },
          0,
        );
        tl.fromTo(
          line,
          { autoAlpha: 0, scaleY: 0, transformOrigin: "center top" },
          { autoAlpha: 1, scaleY: 1, duration: 0.7, ease: "power3.inOut" },
          1.25,
        )
          .fromTo(
            stat,
            { autoAlpha: 0, y: 36 },
            { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out" },
            1.95,
          )
          .fromTo(
            sgs,
            { autoAlpha: 0, y: 36 },
            { autoAlpha: 1, y: 0, duration: 1.1, ease: "power3.out" },
            2.5,
          );
      } else {
        tl.fromTo(
          line,
          { autoAlpha: 0, scaleX: 0, transformOrigin: "left center" },
          { autoAlpha: 1, scaleX: 1, duration: 0.85, ease: "power3.inOut" },
          1.2,
        )
          .fromTo(
            stat,
            { autoAlpha: 0, y: 36 },
            { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out" },
            2,
          )
          .fromTo(
            sgs,
            { autoAlpha: 0, y: 36 },
            { autoAlpha: 1, y: 0, duration: 1.1, ease: "power3.out" },
            2.5,
          );
      }

      if (qaProgress !== null) {
        tl.progress(qaProgress).pause();
        return;
      }

      // one-way: play once when the section enters, then stay built; the
      // transparent glasses video fires on the same beat and holds its
      // final frame (reduced motion: first frame stays as a still)
      ScrollTrigger.create({
        trigger: el,
        start: "top 60%",
        once: true,
        onEnter: () => {
          tl.play();
          if (!reducedMotion)
            vids.forEach((v) => {
              v.currentTime = 0;
              v.play().catch(() => {});
            });
        },
      });
    };

    mm.add("(min-width: 641px)", build(false));
    mm.add("(max-width: 640px)", build(true));
  },
};
