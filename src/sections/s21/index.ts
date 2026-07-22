import "./style.css";
import type { Section } from "../../lib/section";

export const s21: Section = {
  id: "s21",
  html: `
    <div class="stage stage--d">
      <div class="s21-fill"></div>
      <div class="s21-bg s21-bg-d">
        <img src="/assets/1920_Screen-21-01/img1920Screen2101.baked.webp" alt="" />
      </div>
      <div class="s21-text s21-text-d">
        <div class="s21-kicker">Anniversary Collection</div>
        <h2 class="s21-title s21-title-d gtx gtx--ice">Pro Mobile Dock,<br />Gone Mini.</h2>
      </div>
      <div class="s21-arrow s21-arrow-d">
        <img src="/assets/1920_Screen-21-01/imgArrowDown.svg" alt="" />
      </div>
    </div>
    <div class="stage stage--m">
      <div class="s21-fill"></div>
      <div class="s21-bg s21-bg-m">
        <img src="/assets/375_Screen-21-01/img375Screen2101.baked.webp" alt="" />
      </div>
      <div class="s21-text s21-text-m">
        <div class="s21-kicker">Anniversary Collection</div>
        <h2 class="s21-title s21-title-m gtx gtx--ice">Pro Mobile Dock,<br />Gone Mini.</h2>
      </div>
      <div class="s21-arrow s21-arrow-m">
        <img src="/assets/375_Screen-21-01/imgArrowDown.svg" alt="" />
      </div>
    </div>`,
  init(el, ctx) {
    const q = (sel: string) => el.querySelectorAll(sel);
    ctx.gsap
      .timeline({ scrollTrigger: { trigger: el, start: "top 78%" } })
      .from(
        q(".s21-bg"),
        { opacity: 0, scale: 1.04, duration: 1, ease: "power3.out" },
        0
      )
      .from(
        q(".s21-kicker"),
        { opacity: 0, y: 36, duration: 0.9, ease: "power3.out" },
        0.12
      )
      .from(
        q(".s21-title"),
        { opacity: 0, y: 36, duration: 0.9, ease: "power3.out" },
        0.24
      )
      .from(
        q(".s21-arrow"),
        {
          opacity: 0,
          scaleX: 0,
          transformOrigin: "left center",
          duration: 0.9,
          ease: "power3.out",
        },
        0.42
      );
  },
};
