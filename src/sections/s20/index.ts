import "./style.css";
import type { Section } from "../../lib/section";
import { prepareText, revealText } from "../../lib/textfx";

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
    // Ambient text language (lib/textfx.ts): headline words drift in with a
    // soft blur; kicker + info follow as delayed whole-block fades.
    const q = (sel: string) =>
      Array.from(el.querySelectorAll<HTMLElement>(sel));
    for (const t of q(".s20-title")) prepareText(t);
    for (const k of q(".s20-kicker")) prepareText(k, { mode: "block" });
    for (const i of q(".s20-info")) prepareText(i, { mode: "block" });
    const tl = ctx.gsap
      .timeline({ scrollTrigger: { trigger: el, start: "top 78%" } })
      .from(
        q(".s20-photo"),
        { opacity: 0, scale: 1.04, duration: 1.4, ease: "sine.out" },
        0,
      );
    for (const t of q(".s20-title")) tl.add(revealText(t), 0.12);
    for (const k of q(".s20-kicker")) tl.add(revealText(k), 0.55);
    for (const i of q(".s20-info")) tl.add(revealText(i), 0.75);
  },
};
