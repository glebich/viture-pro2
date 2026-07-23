import "./style.css";
import type { Section } from "../../lib/section";
import { prepareText, revealText } from "../../lib/textfx";

/* ---------- card data (exact px from harvest) ---------- */

interface Layer {
  src: string;
  w: number;
  h: number;
  /** offset of layer center from card horizontal center, px */
  x: number;
  /** offset of layer center from card vertical center, px */
  y: number;
  fit?: "cover";
  posBottom?: boolean;
  radius?: number;
  rotate?: number;
  /** special inner-crop treatment used by the Ultimate Mobile render */
  crop?: boolean;
}

interface Card {
  title: string;
  sub: string;
  glow: Layer;
  crisp: Layer;
  frost: string;
  /** heading horizontal offset from card center, px */
  hdx: number;
  w: number;
  h: number;
  /** ambient hover-halo tint echoing the product glow (desktop only) */
  tint?: string;
}

const AD = "/assets/1920_Screen-26-01";
const AM = "/assets/375_Screen-26-01";

const cardsD: Card[] = [
  {
    title: "Dock Mini", sub: "Switch 2 · Ally X", hdx: 1, w: 375, h: 323,
    tint: "rgba(255, 178, 122, 0.55)",
    frost: `${AD}/imgRectangle1329135002.webp`,
    glow: { src: `${AD}/img1.webp`, w: 233, h: 171, x: 2, y: -57, posBottom: true },
    crisp: { src: `${AD}/img1.webp`, w: 233, h: 171, x: 0, y: -47, posBottom: true },
  },
  {
    title: "Pro Mobile Dock", sub: "Switch 2 · Ally X", hdx: 1, w: 375, h: 323,
    tint: "rgba(255, 164, 102, 0.55)",
    frost: `${AD}/imgRectangle1329135002.webp`,
    glow: { src: `${AD}/img1.webp`, w: 233, h: 171, x: 12, y: -37, posBottom: true },
    crisp: { src: `${AD}/img619965685Jpg1.webp`, w: 221, h: 185, x: 3, y: -38, posBottom: true },
  },
  {
    title: "Neckband", sub: "All-day compute", hdx: -14, w: 375, h: 323,
    tint: "rgba(150, 190, 255, 0.38)",
    frost: `${AD}/imgRectangle1329135002.webp`,
    glow: { src: `${AD}/img3.webp`, w: 278.974, h: 297.29, x: -38.82, y: -85.29, rotate: -75, posBottom: true },
    crisp: { src: `${AD}/img3.webp`, w: 278.974, h: 297.29, x: -15.82, y: -65.29, rotate: -75, posBottom: true },
  },
  {
    title: "SpaceWalker", sub: "Workspace", hdx: 1, w: 375, h: 323,
    tint: "rgba(214, 150, 255, 0.45)",
    frost: `${AD}/imgRectangle1329135002.webp`,
    glow: { src: `${AD}/img4.webp`, w: 119, h: 119, x: 5, y: -68, fit: "cover", radius: 32 },
    crisp: { src: `${AD}/img4.webp`, w: 119, h: 119, x: 1, y: -50, fit: "cover", radius: 32 },
  },
  {
    title: "Ultimate Mobile", sub: "Controller", hdx: 1, w: 375, h: 323,
    tint: "rgba(198, 132, 255, 0.50)",
    frost: `${AD}/imgRectangle1329135002.webp`,
    glow: { src: `${AD}/img5.webp`, w: 333, h: 222, x: 1, y: -30.5, crop: true },
    crisp: { src: `${AD}/img5.webp`, w: 251, h: 180, x: -4, y: -49.5, crop: true },
  },
  {
    title: "USB-C Adapters", sub: "iPhone 17 ready", hdx: 1, w: 375, h: 323,
    tint: "rgba(255, 200, 156, 0.45)",
    frost: `${AD}/imgRectangle1329135002.webp`,
    glow: { src: `${AD}/img6.webp`, w: 238, h: 201, x: 0.5, y: -44, fit: "cover" },
    crisp: { src: `${AD}/img6.webp`, w: 238, h: 201, x: 8.5, y: -39, fit: "cover" },
  },
  {
    title: "8BitDo", sub: "Controller", hdx: 1, w: 375, h: 323,
    tint: "rgba(148, 236, 184, 0.42)",
    frost: `${AD}/imgRectangle1329135002.webp`,
    glow: { src: `${AD}/img7.webp`, w: 139, h: 119, x: 5, y: -21, fit: "cover" },
    crisp: { src: `${AD}/imgFrameB58B197E42F144EcB33FDd8658Bc6F83Jpg1.webp`, w: 362, h: 241, x: 0.5, y: -39, fit: "cover" },
  },
];

const cardsM: Card[] = [
  {
    title: "Dock Mini", sub: "Switch 2 · Ally X", hdx: 1, w: 295, h: 256,
    frost: `${AM}/imgRectangle1329135002.webp`,
    glow: { src: `${AM}/img1.webp`, w: 205, h: 150, x: 2, y: -47, posBottom: true },
    crisp: { src: `${AM}/img1.webp`, w: 181, h: 133, x: 0, y: -33.5, posBottom: true },
  },
  {
    title: "Pro Mobile Dock", sub: "Switch 2 · Ally X", hdx: 1, w: 295, h: 256,
    frost: `${AM}/imgRectangle1329135002.webp`,
    glow: { src: `${AM}/img1.webp`, w: 215, h: 158, x: 12, y: -31, posBottom: true },
    crisp: { src: `${AM}/img619965685Jpg1.webp`, w: 163, h: 136, x: 3, y: -28, posBottom: true },
  },
  {
    title: "Neckband", sub: "All-day compute", hdx: 0, w: 295, h: 256,
    frost: `${AM}/imgRectangle1329135002.webp`,
    glow: { src: `${AM}/img3.webp`, w: 250.635, h: 267.09, x: -27.9, y: -68.2, rotate: -75, posBottom: true },
    crisp: { src: `${AM}/img3.webp`, w: 199.588, h: 212.693, x: -17.19, y: -53.92, rotate: -75, posBottom: true },
  },
  {
    title: "SpaceWalker", sub: "Workspace", hdx: 1, w: 295, h: 256,
    frost: `${AM}/imgRectangle1329135002.webp`,
    glow: { src: `${AM}/img4.webp`, w: 102, h: 102, x: 0.5, y: -60, fit: "cover", radius: 32 },
    crisp: { src: `${AM}/img4.webp`, w: 101, h: 101, x: 1, y: -36.5, fit: "cover", radius: 32 },
  },
  {
    title: "Ultimate Mobile", sub: "Controller", hdx: 1, w: 295, h: 256,
    frost: `${AM}/imgRectangle1329135002.webp`,
    glow: { src: `${AM}/img5.webp`, w: 303, h: 202, x: 1, y: -21, crop: true },
    crisp: { src: `${AM}/img5.webp`, w: 177, h: 127, x: -4, y: -38.5, crop: true },
  },
  {
    title: "USB-C Adapters", sub: "iPhone 17 ready", hdx: 1, w: 295, h: 256,
    frost: `${AM}/imgRectangle1329135002.webp`,
    glow: { src: `${AM}/img6.webp`, w: 208, h: 175, x: 0.5, y: -31.5, fit: "cover" },
    crisp: { src: `${AM}/img6.webp`, w: 170, h: 143, x: 0.5, y: -33.5, fit: "cover" },
  },
  {
    title: "8BitDo", sub: "Controller", hdx: 1, w: 295, h: 259,
    frost: `${AM}/imgRectangle1329135003.webp`,
    glow: { src: `${AM}/img7.webp`, w: 139, h: 119, x: 5, y: -21, fit: "cover" },
    crisp: { src: `${AM}/imgFrameB58B197E42F144EcB33FDd8658Bc6F83Jpg1.webp`, w: 204, h: 120, x: -3.5, y: -37.5, posBottom: true },
  },
];

/* ---------- html builders ---------- */

function layer(l: Layer, cls: string): string {
  const pos =
    `left:calc(50% + ${l.x}px);top:calc(50% + ${l.y}px);` +
    `width:${l.w}px;height:${l.h}px;` +
    (l.rotate ? `transform:translate(-50%,-50%) rotate(${l.rotate}deg);` : "") +
    (l.radius ? `border-radius:${l.radius}px;` : "");
  const imgStyle =
    (l.fit ? "object-fit:cover;" : "") +
    (l.posBottom ? "object-position:bottom;" : "") +
    (l.radius ? `border-radius:${l.radius}px;` : "");
  const img = l.crop
    ? `<img src="${l.src}" alt="" style="position:absolute;height:117.25%;width:149.8%;left:-23.11%;top:-7.24%;max-width:none;">`
    : `<img src="${l.src}" alt="" style="width:100%;height:100%;${imgStyle}">`;
  return `<div class="s26-layer ${cls}${l.crop ? " s26-layer--crop" : ""}" style="${pos}">${img}</div>`;
}

function card(c: Card, mobile: boolean): string {
  const heading = `
    <div class="s26-heading" style="left:calc(50% + ${c.hdx}px);">
      <p class="s26-name">${c.title}</p>
      <p class="s26-sub">${c.sub}</p>
    </div>`;
  const frost = `
    <div class="s26-frost">
      <img src="${c.frost}" alt="">
    </div>`;
  const g = layer(c.glow, "s26-glow");
  const k = layer(c.crisp, "s26-crisp");
  /* harvest order: desktop = glow, frost, heading, crisp;
     mobile = glow, frost, crisp, heading */
  const inner = mobile ? g + frost + k + heading : g + frost + heading + k;
  /* desktop: pre-rendered ambient halo behind the clipped card body,
     revealed on hover via opacity only */
  const halo = !mobile && c.tint ? `<div class="s26-halo"></div>` : "";
  const tint = c.tint ? `--s26-tint:${c.tint};` : "";
  return `<div class="s26-card" style="width:${c.w}px;height:${c.h}px;${tint}">${halo}<div class="s26-clip">${inner}</div></div>`;
}

const rowsD = `
  <div class="s26-row s26-row--1">${cardsD.slice(0, 4).map((c) => card(c, false)).join("")}</div>
  <div class="s26-row s26-row--2">${cardsD.slice(4).map((c) => card(c, false)).join("")}</div>`;

const railM = `
  <div class="s26-rail"><div class="s26-stack">${cardsM.map((c) => card(c, true)).join("")}</div></div>`;

export const s26: Section = {
  id: "s26",
  html: `
    <div class="stage stage--d">${rowsD}</div>
    <div class="stage stage--m">${railM}</div>
  `,
  init(el, ctx) {
    // Ambient text language (lib/textfx.ts): the cards keep their staggered
    // rise (slowed to the ambient tempo) while each card's heading condenses
    // in as a soft delayed block fade trailing its card.
    const headings = Array.from(
      el.querySelectorAll<HTMLElement>(".s26-heading"),
    );
    for (const h of headings) prepareText(h, { mode: "block", y: 14 });
    const tl = ctx.gsap
      .timeline({
        scrollTrigger: { trigger: el, start: "top 78%" },
        defaults: { ease: "power2.out" },
      })
      .from(el.querySelectorAll(".stage--d .s26-card"), {
        opacity: 0,
        y: 30,
        duration: 1.2,
        stagger: 0.08,
      })
      .from(
        el.querySelectorAll(".stage--m .s26-card"),
        { opacity: 0, y: 30, duration: 1.2, stagger: 0.08 },
        0
      );
    // headings trail their cards, one soft fade each along the same cascade
    el.querySelectorAll<HTMLElement>(".stage--d .s26-card").forEach((c, i) => {
      const h = c.querySelector<HTMLElement>(".s26-heading");
      if (h) tl.add(revealText(h), 0.35 + i * 0.08);
    });
    el.querySelectorAll<HTMLElement>(".stage--m .s26-card").forEach((c, i) => {
      const h = c.querySelector<HTMLElement>(".s26-heading");
      if (h) tl.add(revealText(h), 0.35 + i * 0.08);
    });

    /* round 21 — mobile card rail rides the PAGE scroll (pinned scrub)
       instead of an inner overflow scroller: touch swipes over a card used
       to scroll the rail (or die on it entirely under Lenis) and visitors
       could not get past this section. The pin length equals the stack's
       clipped overflow so the scroll speed through the cards matches the
       finger 1:1; y/offsets are layout px (the stage's cover-scale rides
       ABOVE them via transform, and the function-based end re-derives the
       real-px length from the live scale on every refresh). */
    const mm = ctx.gsap.matchMedia();
    mm.add("(max-width: 640px)", () => {
      const rail = el.querySelector<HTMLElement>(".s26-rail");
      const stack = el.querySelector<HTMLElement>(".s26-stack");
      if (!rail || !stack) return;
      const overflow = () =>
        Math.max(0, stack.offsetHeight - rail.offsetHeight);
      const scale = () => {
        const r = stack.getBoundingClientRect();
        return stack.offsetHeight > 0 ? r.height / stack.offsetHeight : 1;
      };
      if (overflow() <= 0) return;
      ctx.gsap.fromTo(
        stack,
        { y: 0 },
        {
          y: () => -overflow(),
          ease: "none",
          immediateRender: false,
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: () => "+=" + Math.round(overflow() * scale()),
            pin: true,
            scrub: 0.4,
            invalidateOnRefresh: true,
          },
        },
      );
    });

    /* ambient hover halo follows the cursor slightly (desktop pointers only).
       Only two CSS custom props are written per move — the halo itself is a
       pre-rendered gradient that fades via opacity, so no layout/blur cost. */
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      el.querySelectorAll<HTMLElement>(".stage--d .s26-card").forEach((card) => {
        let rect: DOMRect | null = null;
        card.addEventListener("pointerenter", () => {
          rect = card.getBoundingClientRect();
        });
        card.addEventListener("pointermove", (e: PointerEvent) => {
          if (!rect) rect = card.getBoundingClientRect();
          const rx = (e.clientX - rect.left) / rect.width - 0.5;
          const ry = (e.clientY - rect.top) / rect.height - 0.5;
          /* clamped design-px offsets from the card centre */
          card.style.setProperty("--gx", `${Math.max(-44, Math.min(44, rx * 88)).toFixed(1)}px`);
          card.style.setProperty("--gy", `${Math.max(-34, Math.min(34, ry * 68)).toFixed(1)}px`);
        });
        card.addEventListener("pointerleave", () => {
          rect = null; /* keep last --gx/--gy so the halo fades out in place */
        });
      });
    }
  },
};
