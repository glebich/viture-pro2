import "./style.css";
import type { Section } from "../../lib/section";

const D = "/assets/1920_Screen-13-01";
const M = "/assets/375_Screen-13-01";

export const s13: Section = {
  id: "s13",
  html: `
    <div class="stage stage--d">
      <div class="s13-photo"><img src="${D}/img1920Screen1301.webp" alt="" /></div>
    </div>
    <div class="stage stage--m">
      <div class="s13-mwrap">
        <div class="s13-mcrop"><img src="${M}/imgWebStillsP6000000011.webp" alt="" /></div>
      </div>
    </div>
  `,
  init(el, ctx) {
    // full-bleed photo interstitial: settle-in of the render
    ctx.gsap.from(el.querySelectorAll(".s13-photo img, .s13-mcrop img"), {
      opacity: 0,
      scale: 1.05,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 78%" },
    });
  },
};
