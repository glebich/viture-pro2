import "./style.css";
import type { Section } from "../../lib/section";

const INFO = `
      <span class="s20-mono">Mono</span>
      <span class="s20-note">Standard · Comes with every Pro 2</span>`;

export const s20: Section = {
  id: "s20",
  html: `
    <div class="stage stage--d">
      <div class="s20-bg"></div>
      <img class="s20-photo s20-photo-d" src="/assets/1920_Screen-20-01/imgImage.webp" alt="Designer lens shade" />
      <div class="s20-text s20-text-d">
        <div class="s20-kicker">Designer Lens Shade</div>
        <h2 class="s20-title s20-title-d gtx gtx--peach">Free Lens<br />Shade Included</h2>
      </div>
      <div class="s20-info s20-info-d">${INFO}
      </div>
    </div>
    <div class="stage stage--m">
      <div class="s20-bg"></div>
      <img class="s20-photo s20-photo-m" src="/assets/375_Screen-20-01/imgImage.webp" alt="Designer lens shade" />
      <div class="s20-text s20-text-m">
        <div class="s20-kicker">Designer Lens Shade</div>
        <h2 class="s20-title s20-title-m gtx gtx--peach">Free Lens<br />Shade Included</h2>
      </div>
      <div class="s20-info s20-info-m">${INFO}
      </div>
    </div>`,
  init(el, ctx) {
    const q = (sel: string) => el.querySelectorAll(sel);
    ctx.gsap
      .timeline({ scrollTrigger: { trigger: el, start: "top 78%" } })
      .from(
        q(".s20-photo"),
        { opacity: 0, scale: 1.04, duration: 1, ease: "power3.out" },
        0
      )
      .from(
        q(".s20-kicker"),
        { opacity: 0, y: 36, duration: 0.9, ease: "power3.out" },
        0.08
      )
      .from(
        q(".s20-title"),
        { opacity: 0, y: 36, duration: 0.9, ease: "power3.out" },
        0.2
      )
      .from(
        q(".s20-info"),
        { opacity: 0, y: 36, duration: 0.9, ease: "power3.out" },
        0.32
      );
  },
};
