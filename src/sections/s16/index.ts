import "./style.css";
import type { Section } from "../../lib/section";

const D = "/assets/1920_Screen-16-01";
const M = "/assets/375_Screen-16-01";

export const s16: Section = {
  id: "s16",
  html: `
    <div class="stage stage--d">
      <div class="s16-bg"></div>
      <div class="s16-glow">
        <div class="s16-glow-in"><img src="${D}/imgEllipse1329130924.baked.webp" alt="" /></div>
      </div>
      <div class="s16-glasses"><img src="${D}/imgGlasses1.webp" alt="" /></div>
      <div class="s16-content">
        <p class="s16-eyebrow">Slimmer Than Pro</p>
        <h2 class="s16-title gtx gtx--warm">Thin Enough to Disappear</h2>
        <div class="s16-line"><img src="${D}/imgLine.svg" alt="" /></div>
        <div class="s16-benefits">
          <div class="s16-benefit">
            <p class="s16-stat gtx gtx--warm">16%</p>
            <p class="s16-label">Thinner</p>
          </div>
          <div class="s16-benefit">
            <p class="s16-stat gtx gtx--warm">20%</p>
            <p class="s16-label">Lighter</p>
          </div>
        </div>
      </div>
    </div>
    <div class="stage stage--m">
      <div class="s16-bg"></div>
      <div class="s16-glow s16-glow--m">
        <div class="s16-glow-in"><img src="${M}/imgEllipse1329130924.baked.webp" alt="" /></div>
      </div>
      <div class="s16-glasses s16-glasses--m"><img src="${M}/imgGlasses.webp" alt="" /></div>
      <div class="s16-content s16-content--m">
        <p class="s16-eyebrow">Slimmer Than Pro</p>
        <h2 class="s16-title gtx gtx--warm">Thin Enough to Disappear</h2>
        <div class="s16-line"><img src="${M}/imgLine.svg" alt="" /></div>
        <div class="s16-benefits">
          <div class="s16-benefit">
            <p class="s16-stat gtx gtx--warm">16%</p>
            <p class="s16-label">Thinner</p>
          </div>
          <div class="s16-benefit">
            <p class="s16-stat gtx gtx--warm">20%</p>
            <p class="s16-label">Lighter</p>
          </div>
        </div>
      </div>
    </div>
  `,
  init(el, ctx) {
    // Text/benefits repeat s15 1:1 — keep their entrance minimal and let the
    // alternate crop of the glasses render carry the transition.
    const tl = ctx.gsap.timeline({
      scrollTrigger: { trigger: el, start: "top 78%" },
      defaults: { ease: "power3.out", duration: 0.9 },
    });
    tl.from(el.querySelectorAll(".s16-glow"), { opacity: 0, scale: 1.05, duration: 1 }, 0)
      .from(el.querySelectorAll(".s16-glasses"), { opacity: 0, y: 44, duration: 1 }, 0)
      .from(el.querySelectorAll(".s16-content"), { opacity: 0, y: 36 }, 0.15);

    // subtle parallax on the product render (mirrors s15, opposite drift)
    ctx.gsap.fromTo(
      el.querySelectorAll(".s16-glasses img"),
      { yPercent: 2.5 },
      {
        yPercent: -2.5,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.6 },
      }
    );
  },
};
