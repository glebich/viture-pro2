import "./style.css";
import type { Section } from "../../lib/section";
import type { AnimationItem } from "lottie-web";

/* ---- Logo hover Lottie (desktop, hover-capable pointers only) ----
   Two raster-sequence Lotties (public/lottie/): logo-in.json loops while
   hovered (white mark morphs to orange), logo-out.json plays once on leave
   (orange morphs back to white). Their 100×100 comp holds the mark in the
   bbox (31,37)–(68,63) — exactly the 37×26 design-px static mark — so the
   .hd-lottie boxes are offset by (-31,-37) design px to overlay it 1:1.
   lottie-web (light build) is dynamically imported so touch/mobile visitors
   never download it. */
function initLogoLottie(logo: HTMLElement) {
  const inBox = logo.querySelector<HTMLElement>(".hd-lottie--in")!;
  const outBox = logo.querySelector<HTMLElement>(".hd-lottie--out")!;

  let inAnim: AnimationItem | null = null;
  let outAnim: AnimationItem | null = null;
  let pending = 2; // both JSONs rendered at least once → ready
  let hovered = false;
  let state: "rest" | "in" | "out" = "rest";

  const setState = (s: typeof state) => {
    state = s;
    logo.dataset.logo = s;
  };
  const startIn = () => {
    outAnim!.stop();
    inAnim!.goToAndPlay(0, true);
    setState("in");
  };
  const startOut = () => {
    inAnim!.stop();
    outAnim!.goToAndPlay(0, true);
    setState("out");
  };

  logo.addEventListener("mouseenter", () => {
    hovered = true;
    if (pending === 0) startIn(); // also covers re-entry mid logo-out
  });
  logo.addEventListener("mouseleave", () => {
    hovered = false;
    if (pending === 0 && state === "in") startOut();
  });

  import("lottie-web/build/player/lottie_light").then(({ default: lottie }) => {
    const load = (container: HTMLElement, file: string, loop: boolean) => {
      const anim = lottie.loadAnimation({
        container,
        renderer: "svg",
        loop,
        autoplay: false,
        path: `/lottie/${file}.json`,
      });
      anim.addEventListener("DOMLoaded", () => {
        anim.goToAndStop(0, true); // pre-render frame 0 → no blank first paint
        if (--pending === 0 && hovered) startIn();
      });
      return anim;
    };
    inAnim = load(inBox, "logo-in", true);
    outAnim = load(outBox, "logo-out", false);
    outAnim.addEventListener("complete", () => {
      if (state === "out") setState("rest"); // ignore if re-entered mid-out
    });
  });
}

const A_D = "/assets/1920_header_1920";
const A_M = "/assets/375_header_375";

export const header: Section = {
  id: "header",
  html: `
  <div class="hd-d">
    <div class="hd-left">
      <a class="hd-logo" href="#" aria-label="VITURE home">
        <!-- static mark (inline copy of ${A_D}/imgLogo.svg). On hover-capable
             desktops the Lottie hover animation (initLogoLottie below)
             replaces it during the interaction only. -->
        <svg class="hd-mark" viewBox="0 0 37 26" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M23.8075 26H14.7574L0 0H9.05013L23.8075 26Z" fill="#fff"/>
          <path d="M32.7845 0L37 7.42859H27.9499L23.7343 0H32.7845Z" fill="#fff"/>
        </svg>
        <span class="hd-lottie hd-lottie--in" aria-hidden="true"></span>
        <span class="hd-lottie hd-lottie--out" aria-hidden="true"></span>
      </a>
      <nav class="hd-menu" aria-label="Primary">
        <a href="#">Products</a>
        <a href="#">Store</a>
        <a href="#">Discover</a>
        <a href="#">Support</a>
      </nav>
    </div>
    <div class="hd-pill">
      <div class="hd-icons">
        <button class="hd-ic" type="button" aria-label="Search">
          <img src="${A_D}/imgSearch.svg" alt="" />
        </button>
        <button class="hd-ic" type="button" aria-label="Shopping bag">
          <img src="${A_D}/imgShopping.svg" alt="" />
        </button>
      </div>
      <div class="hd-price">
        <img class="hd-glasses" src="${A_D}/imgGlasses.svg" alt="" />
        <p class="hd-from">From&nbsp;<span>$299</span></p>
      </div>
    </div>
  </div>
  <div class="hd-m">
    <a class="hd-logo-m" href="#" aria-label="VITURE home">
      <img src="${A_M}/imgLogo.svg" alt="VITURE" />
    </a>
    <div class="hd-icons-m">
      <button class="hd-ic" type="button" aria-label="Search">
        <img src="${A_M}/imgSearchSm.svg" alt="" />
      </button>
      <button class="hd-ic" type="button" aria-label="Shopping bag">
        <img src="${A_M}/imgShoppingBag02.svg" alt="" />
      </button>
      <button class="hd-ic" type="button" aria-label="Menu">
        <img src="${A_M}/imgMenuStreamlineLucide11.svg" alt="" />
      </button>
    </div>
  </div>`,
  init(el, ctx) {
    // Hover Lottie only where hovering exists (desktop layout + fine pointer);
    // touch/mobile keeps the plain mark and never loads lottie-web.
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      initLogoLottie(el.querySelector<HTMLElement>(".hd-d .hd-logo")!);
    }

    // Reveal the header after the s01 loader counter finishes (~1.6s).
    ctx.gsap.from(el, {
      autoAlpha: 0,
      y: -24,
      duration: 0.8,
      delay: 1.9,
      ease: "power3.out",
      clearProps: "transform",
    });
  },
};
