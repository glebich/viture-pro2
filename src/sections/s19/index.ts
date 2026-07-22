import "./style.css";
import type { Section } from "../../lib/section";

const A = "/assets/1920_Screen-19-01a";
const B = "/assets/1920_Screen-19-01b";
const M = "/assets/375_Screen-19-01";

function label(mod: string, title: string): string {
  return `
    <div class="s19-label s19-label-${mod}">
      <h3>${title}</h3>
      <p>View</p>
    </div>`;
}

export const s19: Section = {
  id: "s19",
  html: `
    <div class="stage stage--d">
      <div class="s19-bg"></div>
      <div class="s19-photos s19-photos-d">
        <img class="s19-photo-a" src="${A}/imgGeminiGeneratedImageIsyp6Risyp6Risyp1.webp" alt="VITURE Pro 2, 3/4 right view" />
        <div class="s19-photo-b">
          <img src="${B}/imgGeminiGeneratedImageIsyp6Risyp6Risyp2.webp" alt="" />
          <img src="${B}/imgGeminiGeneratedImageIsyp6Risyp6Risyp3.webp" alt="VITURE Pro 2, profile right view" />
        </div>
      </div>
      <img class="s19-dial s19-dial-d" src="${A}/imgCircleLine.svg" alt="" />
      <img class="s19-hand s19-hand-d" src="${A}/imgHandDrag.svg" alt="" />
      ${label("a s19-label-d", "3/4 Right")}
      ${label("b s19-label-d", "Profile Right")}
    </div>
    <div class="stage stage--m">
      <div class="s19-bg"></div>
      <div class="s19-photos s19-photos-m">
        <img class="s19-photo-a" src="${M}/imgGeminiGeneratedImageIsyp6Risyp6Risyp1.webp" alt="VITURE Pro 2, 3/4 right view" />
        <div class="s19-photo-b">
          <img src="${B}/imgGeminiGeneratedImageIsyp6Risyp6Risyp2.webp" alt="" />
          <img src="${B}/imgGeminiGeneratedImageIsyp6Risyp6Risyp3.webp" alt="VITURE Pro 2, profile right view" />
        </div>
      </div>
      <img class="s19-dial s19-dial-m" src="${M}/imgCircleLine.svg" alt="" />
      <img class="s19-hand s19-hand-m" src="${M}/imgHandDrag.svg" alt="" />
      ${label("a s19-label-m", "3/4 Right")}
      ${label("b s19-label-m", "Profile Right")}
    </div>`,
  init(el, ctx) {
    const q = (sel: string) => el.querySelectorAll(sel);

    ctx.gsap.set(q(".s19-label-b"), { opacity: 0, y: 24 });

    // QA harness forces every trigger's animation to a fixed progress, which
    // would freeze the entrance mid-flight — skip it there (?progress=…).
    const qaProgress =
      import.meta.env.DEV && new URLSearchParams(location.search).has("progress");

    // Entrance
    if (!qaProgress)
      ctx.gsap
      .timeline({ scrollTrigger: { trigger: el, start: "top 78%" } })
      .from(
        q(".s19-photos"),
        { opacity: 0, scale: 1.03, duration: 0.9, ease: "power3.out" },
        0
      )
      .from(
        q(".s19-label-a"),
        { opacity: 0, y: 36, duration: 0.9, ease: "power3.out" },
        0.12
      )
      .from(
        q(".s19-dial, .s19-hand"),
        { opacity: 0, duration: 0.8, ease: "power3.out" },
        0.28
      );

    // Pinned scrub: cross-fade 3/4 Right -> Profile Right, dial rotates slightly
    ctx.gsap
      .timeline({
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: "+=150%",
          pin: true,
          scrub: 0.6,
        },
      })
      .to(q(".s19-photo-b"), { opacity: 1, duration: 1, ease: "none" }, 0)
      .to(
        q(".s19-label-a"),
        { opacity: 0, y: -24, duration: 0.45, ease: "none" },
        0
      )
      .to(
        q(".s19-label-b"),
        { opacity: 1, y: 0, duration: 0.45, ease: "none" },
        0.55
      )
      .to(
        q(".s19-dial"),
        { rotation: -14, transformOrigin: "50% 50%", duration: 1, ease: "none" },
        0
      );
  },
};
