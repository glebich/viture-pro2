import "./style.css";
import type { Section } from "../../lib/section";

const AD = "/assets/1920_Screen-23-01";
const AM = "/assets/375_Screen-23-01";

export const s23: Section = {
  id: "s23",
  html: `
  <div class="stage stage--d">
    <div class="s23-bg"><img src="${AD}/img1920Screen2301.baked.webp" alt=""></div>
    <div class="s23-headwrap">
      <h2 class="s23-headline gtx gtx--peach">Made for the way you actually live.</h2>
    </div>
  </div>
  <div class="stage stage--m">
    <div class="s23m-bg"><img src="${AM}/img375Screen2301.baked.webp" alt=""></div>
    <div class="s23m-headwrap">
      <h2 class="s23m-headline gtx gtx--peach">Made for the way you actually live.</h2>
    </div>
  </div>`,

  init(el, ctx) {
    const { gsap } = ctx;
    const mm = gsap.matchMedia();

    mm.add("(min-width: 641px)", () => {
      const d = el.querySelector<HTMLElement>(".stage--d")!;
      gsap
        .timeline({ scrollTrigger: { trigger: el, start: "top 78%" } })
        .from(d.querySelector(".s23-bg"), { opacity: 0, duration: 0.9, ease: "power3.out" }, 0)
        .from(d.querySelector(".s23-headline"), { opacity: 0, y: 36, duration: 0.9, ease: "power3.out" }, 0.15);
    });

    mm.add("(max-width: 640px)", () => {
      const m = el.querySelector<HTMLElement>(".stage--m")!;
      gsap
        .timeline({ scrollTrigger: { trigger: el, start: "top 78%" } })
        .from(m.querySelector(".s23m-bg"), { opacity: 0, duration: 0.9, ease: "power3.out" }, 0)
        .from(m.querySelector(".s23m-headline"), { opacity: 0, y: 36, duration: 0.9, ease: "power3.out" }, 0.15);
    });
  },
};
