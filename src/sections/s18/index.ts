import "./style.css";
import type { Section } from "../../lib/section";

/* s18 — WOMAN portrait interstitial (restored client round 10; the cutout
 * itself stays untouched). Client round 15: the laser-path video backdrop is
 * REMOVED ("video never needs to be there") — the transparent portrait sits
 * on the flat #020202 .s18-bg again. The existing bottom feather into s20
 * and the top feather from s19v keep both folds as one shadow. */

export const s18: Section = {
  id: "s18",
  html: `
    <div class="stage stage--d">
      <div class="s18-bg"></div>
      <img class="s18-photo s18-photo-d" src="/assets/1920_Screen-18-01/img1111.webp" alt="VITURE Pro 2 worn head-on" />
    </div>
    <div class="stage stage--m">
      <div class="s18-bg"></div>
      <img class="s18-photo s18-photo-m" src="/assets/375_Screen-18-01/img1111.webp" alt="VITURE Pro 2 worn head-on" />
    </div>`,
  init(el, ctx) {
    ctx.gsap
      .timeline({ scrollTrigger: { trigger: el, start: "top 78%" } })
      .from(
        el.querySelectorAll(".s18-photo"),
        { opacity: 0, scale: 1.04, duration: 1, ease: "power3.out" },
        0.05
      );
  },
};
