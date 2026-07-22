import "./style.css";
import type { Section } from "../../lib/section";
import { prepareText, revealText } from "../../lib/textfx";

const A_D = "/assets/1920_Screen-05-01";
const A_M = "/assets/375_Screen-05-01";

export const s05: Section = {
  id: "s05",
  html: `
  <div class="stage stage--d">
    <div class="s05-glow"><img src="${A_D}/imgEllipse1329130913.baked.webp" alt="" /></div>
    <img class="s05-kv" src="${A_D}/imgComfortKvArt.webp" alt="COMFORT — glasses form the C, mobile dock forms the T" />
    <h2 class="s05-title gtx gtx--ice cap-trim">The Next Big Thing Is</h2>
  </div>
  <div class="stage stage--m">
    <div class="s05-glow s05-glow--m"><img src="${A_M}/imgEllipse1329130913.baked.webp" alt="" /></div>
    <img class="s05-kv s05-kv--m" src="${A_D}/imgComfortKvArt.webp" alt="COMFORT — glasses form the C, mobile dock forms the T" />
    <h2 class="s05-title s05-title--m gtx gtx--ice cap-trim">The Next Big Thing Is</h2>
  </div>`,
  init(el, ctx) {
    // Ambient text language (lib/textfx.ts): headline words condense in
    // over a slow drift; glow and KV art keep their soft settle underneath.
    const q = (s: string) => Array.from(el.querySelectorAll<HTMLElement>(s));
    for (const t of q(".s05-title")) prepareText(t);
    const tl = ctx.gsap.timeline({
      scrollTrigger: { trigger: el, start: "top 78%" },
      defaults: { ease: "power2.out" },
    });
    tl.from(q(".s05-glow"), { autoAlpha: 0, scale: 1.05, duration: 1.4, ease: "sine.out" });
    for (const t of q(".s05-title")) tl.add(revealText(t), 0.12);
    tl.from(
      q(".s05-kv"),
      { autoAlpha: 0, y: 34, scale: 1.04, duration: 1.3, ease: "power2.out" },
      0.35,
    );
  },
};
