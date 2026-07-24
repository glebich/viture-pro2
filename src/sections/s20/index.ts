import "./style.css";
import type { Section } from "../../lib/section";
import { prepareText, revealText } from "../../lib/textfx";
import { mountFrameStore } from "../../lib/frameseq";

/* Round 23 (client): the lens-shade art is a scroll-driven TWO-ASSET alpha
 * sequence — ASSET_7_1 (30 frames) then ASSET_7_2 (30 frames), "one by one
 * once you scroll". The section's viewport transit maps to frames 0..59:
 * the first shade plays while the page scrolls IN, the second while it
 * scrolls ON — backwards scrubbing falls out for free (cf. s03). The old
 * photo stays as the pre-load / reduced-motion fallback and hides on the
 * first paint (.s20-live). Registration: the assets' union product bbox
 * (356,64)-(1689,984) is mapped uniformly into the design photo box —
 * desktop (968,274,752,532), mobile (41,153,293,207) — math in the CSS. */
const LS_FRAMES = 60;
const LS_URLS = Array.from(
  { length: LS_FRAMES },
  (_, i) => `/assets/ls-frames/ls-${String(i).padStart(2, "0")}.webp`,
);

const INFO = `
      <span class="s20-mono">Mono</span>
      <span class="s20-note">Standard · Comes with every Pro 2</span>`;

export const s20: Section = {
  id: "s20",
  html: `
    <div class="stage stage--d">
      <div class="s20-bg"></div>
      <div class="s20-art s20-art-d">
        <img class="s20-photo s20-photo-d" src="/assets/1920_Screen-20-01/imgImage.webp" alt="Designer lens shade" />
        <canvas class="s20-seq s20-seq-d" width="1920" height="1080" aria-hidden="true"></canvas>
      </div>
      <div class="s20-text s20-text-d">
        <div class="s20-kicker">Designer Lens Shade</div>
        <h2 class="s20-title s20-title-d gtx gtx--peach">Free Lens<br />Shade Included</h2>
      </div>
      <div class="s20-info s20-info-d">${INFO}
      </div>
    </div>
    <div class="stage stage--m">
      <div class="s20-bg"></div>
      <div class="s20-art s20-art-m">
        <img class="s20-photo s20-photo-m" src="/assets/375_Screen-20-01/imgImage.webp" alt="Designer lens shade" />
        <canvas class="s20-seq s20-seq-m" width="1920" height="1080" aria-hidden="true"></canvas>
      </div>
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
        q(".s20-art"),
        { opacity: 0, scale: 1.04, duration: 1.4, ease: "sine.out" },
        0,
      );
    for (const t of q(".s20-title")) tl.add(revealText(t), 0.12);
    for (const k of q(".s20-kicker")) tl.add(revealText(k), 0.55);
    for (const i of q(".s20-info")) tl.add(revealText(i), 0.75);

    // ---- two-asset scroll sequence (round 23) ----
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return; // photo-only

    const canvases = q("canvas.s20-seq") as unknown as HTMLCanvasElement[];
    const store = mountFrameStore(el, ctx, LS_URLS);
    let idx = 0;
    const paint = () => {
      for (const c of canvases) {
        const painted = Number(c.dataset.frame ?? -1);
        if (painted === idx || !store.loaded[idx]) continue;
        const g = c.getContext("2d");
        if (!g) continue;
        g.clearRect(0, 0, c.width, c.height);
        g.drawImage(store.frames[idx], 0, 0, c.width, c.height);
        c.dataset.frame = String(idx);
        c.parentElement!.classList.add("s20-live");
      }
    };
    store.onLoad.add((i) => {
      if (i === idx) paint();
    });
    // Both clips are baked appear→shine→dissolve beats (frame 0 empty,
    // final frames dissolving), so they play in TIME, one after the other
    // — shade one, then shade two, looping while the section is on screen
    // (each clip's fade-out flows into the next one's fade-in, so the
    // loop seam is invisible). Offscreen suspends; re-entry restarts at
    // the first shade. rAF at 30fps with an accumulator (cf. s15).
    const STEP = 1000 / 30;
    let raf = 0;
    let last = 0;
    let acc = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (last === 0) last = t;
      let dt = t - last;
      last = t;
      if (dt > 250) dt = STEP;
      acc += dt;
      while (acc >= STEP) {
        acc -= STEP;
        const n = (idx + 1) % LS_FRAMES;
        if (!store.loaded[n]) {
          acc = 0;
          break; // hold until the next frame is decodable
        }
        idx = n;
      }
      paint();
    };
    const start = () => {
      if (raf) return;
      last = 0;
      acc = 0;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    };
    // rect-based visibility gate (same trio as lib/lazyvideo — not IO)
    let wasVisible = false;
    const update = () => {
      const r = el.getBoundingClientRect();
      const visible = r.bottom > 0 && r.top < window.innerHeight;
      if (visible && !wasVisible) {
        idx = 0; // fresh entry: shade one from its first frame
        start();
      } else if (!visible && wasVisible) {
        stop();
      }
      wasVisible = visible;
    };
    ctx.lenis.on("scroll", update);
    window.addEventListener("scroll", update, { passive: true });
    ctx.ScrollTrigger.addEventListener("refresh", update);
    update();
  },
};
