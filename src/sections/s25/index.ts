import "./style.css";
import type { Section } from "../../lib/section";

const wrap = (m: boolean) => `
  <div class="s25-wrap${m ? " s25-wrap--m" : ""}">
    <p class="s25-label">Same Ecosystem</p>
    <h2 class="s25-title gtx gtx--peach">Everything you already own. Day one.</h2>
  </div>`;

export const s25: Section = {
  id: "s25",
  html: `
    <div class="stage stage--d">${wrap(false)}</div>
    <div class="stage stage--m">${wrap(true)}</div>
  `,
  init(el, ctx) {
    ctx.gsap
      .timeline({
        scrollTrigger: { trigger: el, start: "top 78%" },
        defaults: { ease: "power3.out" },
      })
      .from(el.querySelectorAll(".s25-label"), { opacity: 0, y: 24, duration: 0.8 })
      .from(
        el.querySelectorAll(".s25-title"),
        { opacity: 0, y: 36, duration: 0.9 },
        0.12
      );
  },
};
