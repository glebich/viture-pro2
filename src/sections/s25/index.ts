import "./style.css";
import type { Section } from "../../lib/section";
import { prepareText, revealText } from "../../lib/textfx";

const wrap = (m: boolean) => `
  <div class="s25-wrap${m ? " s25-wrap--m" : ""}">
    <p class="s25-label">Same Ecosystem</p>
    <h2 class="s25-title gtx gtx--peach">Everything you already own. Day one.</h2>
  </div>`;

export const s25: Section = {
  id: "s25",
  html: `
    <div class="stage stage--d">${wrap(false)}</div>
    <div class="stage stage--m">${wrap(true)}</div>
  `,
  init(el, ctx) {
    // Ambient text language (lib/textfx.ts): title words condense in with a
    // slow drift + blur; the label follows as a soft block fade.
    const q = (s: string) => Array.from(el.querySelectorAll<HTMLElement>(s));
    for (const t of q(".s25-title")) prepareText(t);
    for (const l of q(".s25-label")) prepareText(l, { mode: "block" });
    const tl = ctx.gsap.timeline({
      scrollTrigger: { trigger: el, start: "top 78%" },
    });
    for (const t of q(".s25-title")) tl.add(revealText(t), 0);
    for (const l of q(".s25-label")) tl.add(revealText(l), 0.5);
  },
};
