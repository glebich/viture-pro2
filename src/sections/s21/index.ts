import "./style.css";
import type { Section } from "../../lib/section";
import { prepareText, revealText } from "../../lib/textfx";

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
    // Ambient text language (lib/textfx.ts): headline words drift in with a
    // soft blur; kicker follows as a delayed block fade; arrow keeps its
    // draw but arrives unhurried at the tail.
    const q = (sel: string) =>
      Array.from(el.querySelectorAll<HTMLElement>(sel));
    for (const t of q(".s21-title")) prepareText(t);
    for (const k of q(".s21-kicker")) prepareText(k, { mode: "block" });
    const tl = ctx.gsap
      .timeline({ scrollTrigger: { trigger: el, start: "top 78%" } })
      .from(
        q(".s21-bg"),
        { opacity: 0, scale: 1.04, duration: 1.4, ease: "sine.out" },
        0,
      );
    for (const t of q(".s21-title")) tl.add(revealText(t), 0.12);
    for (const k of q(".s21-kicker")) tl.add(revealText(k), 0.55);
    tl.from(
      q(".s21-arrow"),
      {
        opacity: 0,
        scaleX: 0,
        transformOrigin: "left center",
        duration: 1.1,
        ease: "power2.out",
      },
      0.9,
    );
  },
};
