import "./style.css";
import type { Section } from "../../lib/section";

const AD = "/assets/1920_Screen-28-01";
const AM = "/assets/375_Screen-27-01b";

const desktop = `
  <img class="s28-still" src="${AD}/imgStillsIt322.webp" alt="">
  <h2 class="s28-title gtx gtx--peach"><b>Five years</b> in the making.<br>A premium only you can feel.</h2>
  <div class="s28-bottom">
    <p class="s28-specs">UltraClarity 3.0 · 63g · Ergo-perfect · Razor-thin · Myopia −5.00D · SGS A+</p>
    <div class="s28-block">
      <img class="s28-block-bg" src="${AD}/imgBlock.webp" alt="">
      <div class="s28-left">
        <p class="s28-offer-title">Exclusive offer on the anniversary collection</p>
        <p class="s28-offer-sub">The classic that started it all — reborn for year five.</p>
      </div>
      <div class="s28-right">
        <div class="s28-off">
          <span class="s28-price">$20</span>
          <span class="s28-offword"><span>off</span></span>
        </div>
        <div class="s28-vline"></div>
        <button class="s28-btn" type="button">Grab NOW</button>
      </div>
    </div>
  </div>`;

const mobile = `
  <img class="s28-still-m" src="${AM}/imgStillsIt322.webp" alt="">
  <h2 class="s28-title-m gtx gtx--peach"><b>Five years</b> in the making. A premium only you can feel.</h2>
  <div class="s28-bottom-m">
    <p class="s28-specs-m">UltraClarity 3.0 · 63g · Ergo-perfect · Razor-thin · Myopia −5.00D · SGS A+</p>
    <div class="s28-block-m">
      <img class="s28-block-bg" src="${AM}/imgBlock.webp" alt="">
      <div class="s28-left-m">
        <p class="s28-offer-title-m">Exclusive offer on the anniversary collection</p>
        <p class="s28-offer-sub-m">The classic that started it all — reborn for year five.</p>
      </div>
      <div class="s28-right-m">
        <div class="s28-off s28-off--m">
          <span class="s28-price-m">$20</span>
          <span class="s28-offword s28-offword--m"><span>off</span></span>
        </div>
        <div class="s28-vline s28-vline--m"></div>
        <button class="s28-btn s28-btn--m" type="button">Grab Now</button>
      </div>
    </div>
  </div>`;

export const s28: Section = {
  id: "s28",
  html: `
    <div class="stage stage--d">${desktop}</div>
    <div class="stage stage--m">${mobile}</div>
  `,
  init(el, ctx) {
    ctx.gsap
      .timeline({
        scrollTrigger: { trigger: el, start: "top 78%" },
        defaults: { ease: "power3.out" },
      })
      .from(el.querySelectorAll(".s28-still, .s28-still-m"), {
        opacity: 0,
        scale: 1.04,
        duration: 1,
        transformOrigin: "50% 50%",
      })
      .from(
        el.querySelectorAll(".s28-title, .s28-title-m"),
        { opacity: 0, y: 36, duration: 0.9 },
        0.15
      )
      .from(
        el.querySelectorAll(".s28-specs, .s28-specs-m"),
        { opacity: 0, y: 24, duration: 0.8 },
        0.3
      )
      .from(
        el.querySelectorAll(".s28-block, .s28-block-m"),
        { opacity: 0, y: 36, duration: 0.9 },
        0.4
      );
  },
};
