import "./style.css";
import type { Section } from "../../lib/section";
import { prepareText, revealText } from "../../lib/textfx";

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
    // Ambient text language (see lib/textfx.ts): the headline condenses in
    // word by word (slow drift + soft blur), the badge and subline follow as
    // whole-block soft fades — unhurried, riding the ambient fluid in.
    const q = (s: string) => Array.from(el.querySelectorAll<HTMLElement>(s));
    for (const t of q(".s02-title")) prepareText(t);
    for (const b of q(".s02-badge")) prepareText(b, { mode: "block" });
    for (const p of q(".s02-sub")) prepareText(p, { mode: "block" });
    const tl = ctx.gsap.timeline({
      scrollTrigger: { trigger: el, start: "top 78%" },
    });
    for (const t of q(".s02-title")) tl.add(revealText(t), 0);
    for (const b of q(".s02-badge")) tl.add(revealText(b), 0.45);
    for (const p of q(".s02-sub")) tl.add(revealText(p), 0.65);
    tl.from(
      q(".s02-scroll"),
      { opacity: 0, duration: 1.2, ease: "sine.out" },
      1.0,
    );
  },
};
