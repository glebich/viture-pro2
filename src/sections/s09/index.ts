import "./style.css";
import type { Section } from "../../lib/section";

const AD = "/assets/1920_Screen-09-01";
const AM = "/assets/375_Screen-09-01";

const bg = (dir: string) => `
  <div class="s09-bg">
    <div class="s09-fill"></div>
    <div class="s09-ellipse"><div class="s09-ellipse-in"><img src="${dir}/imgEllipse1329130913.svg" alt=""></div></div>
    <div class="s09-glow"><img src="${dir}/imgHeroStill000000021.webp" alt=""></div>
  </div>`;

const html = `
<div class="stage stage--d">
  ${bg(AD)}
  <div class="s09-title s09-title--d">VITURE Pro 2</div>
</div>
<div class="stage stage--m">
  <div class="s09-bgwrap">${bg(AM)}</div>
  <div class="s09-title s09-title--m">VITURE Pro 2</div>
</div>
`;

export const s09: Section = {
  id: "s09",
  html,
  init(el, ctx) {
    const { gsap } = ctx;
    const mm = gsap.matchMedia();

    const build = (stageSel: string) => () => {
      const stage = el.querySelector<HTMLElement>(stageSel)!;
      const q = (s: string) => stage.querySelector<HTMLElement>(s)!;
      const title = q(".s09-title");
      gsap.set(title, { xPercent: 50, yPercent: -50 });
      gsap
        .timeline({ scrollTrigger: { trigger: el, start: "top 78%" } })
        .fromTo(
          q(".s09-ellipse"),
          { opacity: 0 },
          { opacity: 1, duration: 0.9, ease: "power2.out" },
          0,
        )
        .fromTo(
          q(".s09-glow"),
          { opacity: 0 },
          { opacity: 1, duration: 1, ease: "power2.out" },
          0.08,
        )
        .fromTo(
          title,
          { opacity: 0, y: 44 },
          { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" },
          0.12,
        );
    };

    mm.add("(min-width: 641px)", build(".stage--d"));
    mm.add("(max-width: 640px)", build(".stage--m"));
  },
};
