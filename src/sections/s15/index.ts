import "./style.css";
import type { Section } from "../../lib/section";

/* s15 — merged page (former s15 + s16, client round 5; unpinned round 7):
 * one "Thin Enough to Disappear" page; the copy and the 16%/20% stats
 * persist while the top-down glasses render does a slow camera pan
 * between the two harvest crop framings (Screen-15-01 → Screen-16-01).
 *
 * Client round 7: "glasses need to be switched automatically, not by
 * using scroll" — the section is a normal 100vh screen again (no pin),
 * and the camera pan is TIME-based: a gentle infinite loop
 * (hold A → 6s pan → hold B → 6s pan back, power2.inOut) that plays
 * while the section is on screen and pauses when it scrolls away.
 *
 * The pan is transform-only: both harvest renders are stacked inside a
 * .s15-cam mover authored at the Screen-15 img rect; translating/scaling
 * the mover to the Screen-16 img rect reproduces the second crop exactly
 * (rect math below), and a subtle cross-fade to the Screen-16 export at
 * the end of the pan guarantees framing B is pixel-true to the harvest.
 *
 * Desktop rect math (design px):
 *   crop A (957,163,670×751), img -49.87%/-35.8%/338.33%/169.94%
 *     → img rect (622.87,-105.86) 2266.81×1276.25
 *   crop B (955,211,680×713), img -173.87%/-35.8%/316.57%/169.94%
 *     → img rect (-227.32,-44.25) 2152.68×1211.67
 *   cam: x -850.19, y 61.61, scaleX .94966, scaleY .94940 (origin 0 0)
 * Mobile:
 *   crop A (44,409,287×322) → img rect (-99.13,293.72) 971.01×547.21
 *   crop B (49,416,279×312) → img rect (-436.10,304.30) 883.23×530.21
 *   cam: x -336.97, y 10.58, scaleX .90960, scaleY .96893
 */

const D15 = "/assets/1920_Screen-15-01";
const D16 = "/assets/1920_Screen-16-01";
const M15 = "/assets/375_Screen-15-01";
const M16 = "/assets/375_Screen-16-01";

const CAM_D = { x: -850.19, y: 61.61, scaleX: 0.94966, scaleY: 0.9494 };
const CAM_M = { x: -336.97, y: 10.58, scaleX: 0.9096, scaleY: 0.96893 };

const content = `
  <p class="s15-eyebrow">Slimmer Than Pro</p>
  <h2 class="s15-title gtx gtx--warm">Thin Enough to Disappear</h2>
  <div class="s15-line"><img src="__M__/imgLine.svg" alt="" /></div>
  <div class="s15-benefits">
    <div class="s15-benefit">
      <p class="s15-stat gtx gtx--warm">16%</p>
      <p class="s15-label">Thinner</p>
    </div>
    <div class="s15-benefit">
      <p class="s15-stat gtx gtx--warm">20%</p>
      <p class="s15-label">Lighter</p>
    </div>
  </div>`;

export const s15: Section = {
  id: "s15",
  html: `
    <div class="stage stage--d">
      <div class="s15-bg"></div>
      <div class="s15-glow">
        <div class="s15-glow-in"><img src="${D15}/imgEllipse1329130924.baked.webp" alt="" /></div>
      </div>
      <div class="s15-glasses">
        <div class="s15-cam">
          <img class="s15-img-a" src="${D15}/imgGlasses1.webp" alt="" />
          <img class="s15-img-b" src="${D16}/imgGlasses1.webp" alt="" />
        </div>
      </div>
      <div class="s15-content">${content.replace("__M__", D15)}</div>
    </div>
    <div class="stage stage--m">
      <div class="s15-bg"></div>
      <div class="s15-glow s15-glow--m">
        <div class="s15-glow-in"><img src="${M15}/imgEllipse1329130924.baked.webp" alt="" /></div>
      </div>
      <div class="s15-glasses s15-glasses--m">
        <div class="s15-cam">
          <img class="s15-img-a" src="${M15}/imgGlasses.webp" alt="" />
          <img class="s15-img-b" src="${M16}/imgGlasses.webp" alt="" />
        </div>
      </div>
      <div class="s15-content s15-content--m">${content.replace("__M__", M15)}</div>
    </div>
  `,
  init(el, ctx) {
    const { gsap, ScrollTrigger } = ctx;
    const mm = gsap.matchMedia();

    // QA harness (?progress=p): the camera loop is time-based now, so the
    // harness's scrub-freeze doesn't reach it — freeze it ourselves at p of
    // one cycle (p=0 → framing A, p≈0.45 → framing B). Entrances are
    // skipped in that mode so their from-states can't stick (cf. s03/s10).
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
      const cam = q(".s15-cam");
      const imgB = q(".s15-img-b");

      if (qaProgress === null) {
        // copy + stats keep their entrance (targets never overlap the
        // camera loop's — it only drives .s15-cam / .s15-img-b).
        const tl = gsap.timeline({
          scrollTrigger: { trigger: el, start: "top 78%" },
          defaults: { ease: "power3.out", duration: 0.9 },
        });
        tl.from(q(".s15-glow"), { opacity: 0, scale: 1.05, duration: 1 }, 0)
          .from(q(".s15-glasses"), { opacity: 0, y: 40, duration: 1 }, 0)
          .from(q(".s15-eyebrow"), { opacity: 0, y: 36 }, 0.12)
          .from(q(".s15-title"), { opacity: 0, y: 36 }, 0.22)
          .from(q(".s15-line"), { opacity: 0, scaleX: 0, transformOrigin: "left center", duration: 0.7 }, 0.38)
          .from(q(".s15-benefit"), { opacity: 0, y: 36, stagger: 0.1 }, 0.46);
      }

      // Time-based camera loop (client round 7 — no scroll input): hold on
      // framing A, breathe over to the Screen-16 framing (~6s, power2.inOut,
      // cross-fading to the Screen-16 export late in the pan), hold, and
      // breathe back. Runs only while the section is on screen.
      const camTo = isMobile ? CAM_M : CAM_D;
      const camFrom = { x: 0, y: 0, scaleX: 1, scaleY: 1 };
      const HOLD = 2.2; // s of rest on each framing
      const PAN = 6; // s per camera leg
      const loop = gsap.timeline({ repeat: -1, paused: true });
      loop
        .set(cam, camFrom, 0)
        // hold A: 0 → HOLD
        .to(cam, { ...camTo, duration: PAN, ease: "power2.inOut" }, HOLD)
        .fromTo(
          imgB,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: PAN * 0.4, ease: "none" },
          HOLD + PAN * 0.45,
        )
        // hold B: HOLD+PAN → 2*HOLD+PAN
        .to(cam, { ...camFrom, duration: PAN, ease: "power2.inOut" }, HOLD * 2 + PAN)
        .to(
          imgB,
          { autoAlpha: 0, duration: PAN * 0.4, ease: "none" },
          HOLD * 2 + PAN + PAN * 0.15,
        )
        // hold A again comes from the repeat's leading HOLD
        .to({}, { duration: 0.001 }, (HOLD + PAN) * 2);

      if (qaProgress !== null) {
        loop.pause(qaProgress * loop.duration());
        return;
      }

      // play only while s15 is in view; pause (and keep phase) offscreen
      ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => (self.isActive ? loop.play() : loop.pause()),
      });
    };

    mm.add("(min-width: 641px)", build(false));
    mm.add("(max-width: 640px)", build(true));
  },
};
