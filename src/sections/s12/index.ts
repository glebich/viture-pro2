import "./style.css";
import type { Section } from "../../lib/section";

const D = "/assets/1920_Screen-12-01";
const M = "/assets/375_Screen-11-01b";

export const s12: Section = {
  id: "s12",
  html: `
    <div class="stage stage--d">
      <div class="s12-bg"></div>
      <div class="s12-glow">
        <div class="s12-glow-in"><img src="${D}/imgEllipse1329130913.baked.webp" alt="" /></div>
      </div>
      <div class="s12-still"><img src="${D}/imgHeroStill000000022.webp" alt="" /></div>
      <div class="s12-video"><img src="${D}/imgVitureBeast20HeroVideo00024014.webp" alt="" /></div>
      <div class="s12-text">
        <p class="s12-eyebrow">Built-in Diopter</p>
        <h2 class="s12-title gtx gtx--warm">Edge-to-Edge Sharpness.<br />Adjusted for Every Pair of Eyes.</h2>
        <p class="s12-sub">The optics let focus shift naturally from center to edge</p>
      </div>
      <div class="s12-line"><img src="${D}/imgLine.svg" alt="" /></div>
      <div class="s12-info">
        <p class="s12-stat gtx gtx--warm">0 to -5.0D</p>
        <div class="s12-sgs">
          <img class="s12-sgs-logo" src="${D}/imgLogo1.svg" alt="SGS" />
          <div class="s12-sgs-text">
            <p class="s12-sgs-title">SGS Eye Care Certified</p>
            <p class="s12-sgs-sub">Low blue light &middot; Flicker-free &middot; Low visual fatigue.</p>
          </div>
        </div>
      </div>
    </div>
    <div class="stage stage--m">
      <div class="s12-bg"></div>
      <div class="s12-glow s12-glow--m">
        <div class="s12-glow-in"><img src="${M}/imgEllipse1329130912.baked.webp" alt="" /></div>
      </div>
      <div class="s12-still"><img src="${M}/imgHeroStill000000021.webp" alt="" /></div>
      <div class="s12-video s12-video--m"><img src="${M}/imgVitureBeast20HeroVideo00024013.webp" alt="" /></div>
      <div class="s12-text s12-text--m">
        <p class="s12-eyebrow">Built-in Diopter</p>
        <h2 class="s12-title gtx gtx--warm">Edge-to-Edge Sharpness. Adjusted for Every Pair of Eyes.</h2>
        <p class="s12-sub">The optics let focus shift naturally from center to edge</p>
      </div>
      <div class="s12-vline"><img src="${M}/imgLine.svg" alt="" /></div>
      <div class="s12-info s12-info--m">
        <p class="s12-stat gtx gtx--warm">0 to -5.0D</p>
        <div class="s12-sgs">
          <img class="s12-sgs-logo" src="${M}/imgLogo1.svg" alt="SGS" />
          <div class="s12-sgs-text">
            <p class="s12-sgs-title">SGS Eye Care Certified</p>
            <p class="s12-sgs-sub">Low blue light &middot; Flicker-free &middot; Low visual fatigue.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  init(el, ctx) {
    const tl = ctx.gsap.timeline({
      scrollTrigger: { trigger: el, start: "top 78%" },
      defaults: { ease: "power3.out", duration: 0.9 },
    });
    tl.from(el.querySelectorAll(".s12-video"), { opacity: 0, scale: 1.04, duration: 1 }, 0)
      .from(el.querySelectorAll(".s12-still"), { opacity: 0, duration: 1 }, 0)
      .from(el.querySelectorAll(".s12-eyebrow"), { opacity: 0, y: 36 }, 0.08)
      .from(el.querySelectorAll(".s12-title"), { opacity: 0, y: 36 }, 0.16)
      .from(el.querySelectorAll(".s12-sub"), { opacity: 0, y: 36 }, 0.24)
      .from(el.querySelectorAll(".s12-line"), { opacity: 0, scaleX: 0, transformOrigin: "left center", duration: 0.7 }, 0.42)
      .from(el.querySelectorAll(".s12-vline"), { opacity: 0, scaleY: 0, transformOrigin: "center top", duration: 0.7 }, 0.42)
      .from(el.querySelectorAll(".s12-stat"), { opacity: 0, y: 36 }, 0.54)
      .from(el.querySelectorAll(".s12-sgs"), { opacity: 0, y: 36 }, 0.66);
  },
};
