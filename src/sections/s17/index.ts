import "./style.css";
import type { Section } from "../../lib/section";

const D = "/assets/1920_Screen-17-01";
const M = "/assets/375_Screen-17-01";

export const s17: Section = {
  id: "s17",
  html: `
    <div class="stage stage--d">
      <div class="s17-bg"></div>
      <img class="s17-photo s17-glasses-d" src="${D}/imgGlasses1.webp" alt="VITURE Pro 2 glasses" />
      <h2 class="s17-title s17-title-d gtx gtx--peach">Sleek On Every Face,<br />From Every Angle.</h2>
    </div>
    <div class="stage stage--m">
      <div class="s17-bg"></div>
      <div class="s17-photo s17-glasses-m">
        <img src="${M}/imgGlasses.webp" alt="VITURE Pro 2 glasses" />
      </div>
      <h2 class="s17-title s17-title-m gtx gtx--peach">Sleek On Every Face,<br />From Every Angle.</h2>
    </div>`,
  init(el, ctx) {
    ctx.gsap
      .timeline({ scrollTrigger: { trigger: el, start: "top 78%" } })
      .from(
        el.querySelectorAll(".s17-photo"),
        { opacity: 0, scale: 1.04, duration: 1, ease: "power3.out" },
        0
      )
      .from(
        el.querySelectorAll(".s17-title"),
        { opacity: 0, y: 36, duration: 0.9, ease: "power3.out" },
        0.15
      );
  },
};
