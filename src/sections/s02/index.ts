import "./style.css";
import type { Section } from "../../lib/section";

const A_D = "/assets/1920_Screen-02-01";
const A_M = "/assets/375_Screen-02-01";

export const s02: Section = {
  id: "s02",
  html: `
  <div class="stage stage--d">
    <div class="s02-bg">
      <img class="s02-bgimg" src="${A_D}/imgBg.baked.webp" alt="" />
    </div>
    <div class="s02-content">
      <div class="s02-text">
        <div class="s02-badge cap-trim">The Anniversary Collection · 8.6.2026</div>
        <h1 class="s02-title gtx gtx--ice cap-trim">
          <span class="s02-strong">Five years</span> in the making.<br />A premium only you can feel.
        </h1>
        <p class="s02-sub cap-trim">Specs step back. The experience steps up.</p>
      </div>
      <div class="s02-scroll">
        <img class="s02-arrow" src="${A_D}/imgArrowDown.svg" alt="" />
      </div>
    </div>
  </div>
  <div class="stage stage--m">
    <div class="s02-bg">
      <img class="s02-bgimg" src="${A_M}/imgBg.baked.webp" alt="" />
    </div>
    <div class="s02-content s02-content--m">
      <div class="s02-text s02-text--m">
        <div class="s02-badge s02-badge--m cap-trim">The Anniversary Collection · 8.6.2026</div>
        <h1 class="s02-title s02-title--m gtx gtx--ice cap-trim">
          <span class="s02-strong">Five years</span> in the making. A premium only you can feel.
        </h1>
        <p class="s02-sub s02-sub--m cap-trim">Specs step back. The experience steps up.</p>
      </div>
      <div class="s02-scroll s02-scroll--m">
        <img class="s02-arrow s02-arrow--m" src="${A_M}/imgArrowDown.svg" alt="" />
      </div>
    </div>
  </div>`,
  init(el, ctx) {
    // content rides the ambient fluid in with a soft rise — the background
    // layers stay put so there is no hard change against the loader field
    const tl = ctx.gsap.timeline({
      scrollTrigger: { trigger: el, start: "top 78%" },
      defaults: { ease: "power3.out", duration: 0.9 },
    });
    tl.from(el.querySelectorAll(".s02-badge"), { autoAlpha: 0, y: 36 }, 0)
      .from(el.querySelectorAll(".s02-title"), { autoAlpha: 0, y: 36 }, 0.12)
      .from(el.querySelectorAll(".s02-sub"), { autoAlpha: 0, y: 36 }, 0.24)
      .from(
        el.querySelectorAll(".s02-scroll"),
        { autoAlpha: 0, duration: 0.9 },
        0.45,
      );
  },
};
