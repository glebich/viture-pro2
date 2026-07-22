import "./style.css";
import type { Section } from "../../lib/section";

/* s15 — merged page (former s15 + s16, client round 5; unpinned round 7):
 * one "Thin Enough to Disappear" page; the copy and the 16%/20% stats
 * persist over the top-down glasses render.
 *
 * Client round 18: "Delete the sliding glasses images and replace with
 * video: plays every 15 sec with a 15 sec break. First play when you
 * arrive at the page, then 15s break, repeat." The camera-pan loop and
 * both harvest crops are gone; in the render's slot sit two stacked
 * TRANSPARENT client videos (HEVC-alpha .mov for Safari, VP9-alpha .webm
 * for Chromium, both 1920×1080/1s/30fps):
 *   - thin-static: a settle-to-hold idle — it converges to a still pose
 *     (consecutive-frame PSNR rises 42→68dB), so it is not looped; it is
 *     held on its LAST frame, which matches the anim's first frame to
 *     ~40dB (visually identical) — that swap edge is invisible.
 *   - thin-anim: a one-shot light-sweep flourish. It STARTS on the static
 *     hold pose but ENDS on a slightly different camera pose (alpha bbox
 *     (596,150,1324,1000) → (598,176,1326,942), ~22dB vs every static
 *     frame — measured, not slight), so the swap BACK to the static hold
 *     is masked with a 300ms crossfade that reads as the glasses settling.
 *
 * Cadence: section enters the viewport → ANIM plays immediately; on ended
 * → crossfade back to the static hold and start a 15s break; replay while
 * the section stays in view. Offscreen the timer and videos pause
 * (rect-based like lib/lazyvideo — NOT IntersectionObserver, which WebKit
 * handles inconsistently once GSAP reparents pinned siblings into
 * pin-spacers); re-entry replays the anim immediately and restarts the
 * cadence. prefers-reduced-motion: the settled static frame only, no cycle.
 *
 * Placement (design px): the videos render the same glasses as the harvest
 * Screen-15-01 export but front-bar-up, so they are rotated 180°; the
 * rotated pose-A alpha bbox is then mapped onto the harvest render's pair
 * bbox in stage coords (left pair of imgGlasses1.webp (434,383,1073,1106)
 * in its 2560×1440 source → stage (1007.17,233.59,1572.98,874.37) desktop,
 * (65.49,439.26,307.89,714.01) mobile via the old crop-A img rects):
 *   desktop: video element 1492.27×814.19 at (-411.05,10.28) in the window
 *   mobile:  video element 639.30×349.09 at (-176.96,4.40)
 * (~3% deliberate non-uniform stretch — the client render's pose aspect
 * differs slightly from the harvest still; object-fit: fill honors it.)
 */

const D15 = "/assets/1920_Screen-15-01";
const M15 = "/assets/375_Screen-15-01";

const BREAK_MS = 15_000; // rest between anim replays (client: "15 sec break")
const FADE_MS = 300; // anim→static settle crossfade (end poses differ)

const VID = (kind: "static" | "anim") => `
  <video class="s15-vid s15-vid--${kind}" muted playsinline preload="metadata" aria-hidden="true">
    <source src="/video/thin-${kind}-hevc.mov" type="video/quicktime" />
    <source src="/video/thin-${kind}.webm" type="video/webm" />
  </video>`;

const content = `
  <p class="s15-eyebrow">Slimmer Than Pro</p>
  <h2 class="s15-title gtx gtx--warm">Thin Enough to Disappear</h2>
  <div class="s15-line"><img src="__M__/imgLine.svg" alt="" /></div>
  <div class="s15-benefits">
    <div class="s15-benefit">
      <p class="s15-stat gtx gtx--warm">16%</p>
      <p class="s15-label">Thinner</p>
    </div>
    <div class="s15-benefit">
      <p class="s15-stat gtx gtx--warm">20%</p>
      <p class="s15-label">Lighter</p>
    </div>
  </div>`;

export const s15: Section = {
  id: "s15",
  html: `
    <div class="stage stage--d">
      <div class="s15-bg"></div>
      <div class="s15-glow">
        <div class="s15-glow-in"><img src="${D15}/imgEllipse1329130924.baked.webp" alt="" /></div>
      </div>
      <div class="s15-glasses">${VID("static")}${VID("anim")}</div>
      <div class="s15-content">${content.replace("__M__", D15)}</div>
    </div>
    <div class="stage stage--m">
      <div class="s15-bg"></div>
      <div class="s15-glow s15-glow--m">
        <div class="s15-glow-in"><img src="${M15}/imgEllipse1329130924.baked.webp" alt="" /></div>
      </div>
      <div class="s15-glasses s15-glasses--m">${VID("static")}${VID("anim")}</div>
      <div class="s15-content s15-content--m">${content.replace("__M__", M15)}</div>
    </div>
  `,
  init(el, ctx) {
    const { gsap, ScrollTrigger, lenis } = ctx;
    const mm = gsap.matchMedia();

    // QA harness (?progress=p): freeze the scene on the settled static pose
    // and skip entrances so their from-states can't stick (cf. s03/s10).
    const qaProgress = (() => {
      if (!import.meta.env.DEV) return null;
      const raw = new URLSearchParams(location.search).get("progress");
      if (raw === null) return null;
      const p = parseFloat(raw);
      return Number.isNaN(p) ? null : p;
    })();

    // entrances stay per-breakpoint (copy + stats + glow + glasses slot);
    // they touch only the container, never the videos' opacity, so they
    // can't fight the cycle below.
    const build = (isMobile: boolean) => () => {
      if (qaProgress !== null) return;
      const stage = el.querySelector<HTMLElement>(
        isMobile ? ".stage--m" : ".stage--d",
      )!;
      const q = (s: string) => stage.querySelectorAll<HTMLElement>(s);
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: "top 78%" },
        defaults: { ease: "power3.out", duration: 0.9 },
      });
      tl.from(q(".s15-glow"), { opacity: 0, scale: 1.05, duration: 1 }, 0)
        .from(q(".s15-glasses"), { opacity: 0, y: 40, duration: 1 }, 0)
        .from(q(".s15-eyebrow"), { opacity: 0, y: 36 }, 0.12)
        .from(q(".s15-title"), { opacity: 0, y: 36 }, 0.22)
        .from(q(".s15-line"), { opacity: 0, scaleX: 0, transformOrigin: "left center", duration: 0.7 }, 0.38)
        .from(q(".s15-benefit"), { opacity: 0, y: 36, stagger: 0.1 }, 0.46);
    };
    mm.add("(min-width: 641px)", build(false));
    mm.add("(max-width: 640px)", build(true));

    /* --------------------------- video cycle --------------------------- */

    const statics = Array.from(
      el.querySelectorAll<HTMLVideoElement>("video.s15-vid--static"),
    );
    const anims = Array.from(
      el.querySelectorAll<HTMLVideoElement>("video.s15-vid--anim"),
    );
    const all = [...statics, ...anims];

    // the static clip is a settle-to-hold, not a loopable idle: park it on
    // its final (settled) frame — the pose the anim launches from — instead
    // of playing it, so the under-layer always matches anim frame 0.
    const parkStatic = (v: HTMLVideoElement) => {
      const seek = () => {
        if (v.duration > 0) v.currentTime = Math.max(0, v.duration - 0.05);
      };
      if (v.readyState >= 1) seek();
      else v.addEventListener("loadedmetadata", seek, { once: true });
    };

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      qaProgress !== null
    ) {
      // static poster only: settled frame, no cycle, anims stay hidden
      for (const v of statics) {
        v.preload = "auto";
        v.load();
        parkStatic(v);
      }
      return;
    }

    let loaded = false;
    let wasVisible = false;
    let timer: number | null = null;

    const clearTimer = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };

    const isVisible = () => {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight;
    };

    const playAnim = () => {
      for (const v of anims) {
        v.style.transition = "none";
        if (v.currentTime > 0.001) v.currentTime = 0;
        if (v.offsetParent !== null) {
          // active breakpoint: show over the (identical) static hold frame
          v.style.opacity = "1";
          v.play().catch(() => {});
        } else {
          v.style.opacity = "0";
          if (!v.paused) v.pause();
        }
      }
    };

    for (const v of anims) {
      v.addEventListener("ended", () => {
        // settle back onto the static hold; the end poses differ slightly
        // (see header comment) so a hard swap would pop — crossfade instead
        v.style.transition = `opacity ${FADE_MS}ms ease`;
        v.style.opacity = "0";
        window.setTimeout(() => {
          // rewind during the break so the next reveal can never flash the
          // end pose before the seek lands
          if (v.paused) v.currentTime = 0;
        }, FADE_MS + 50);
        clearTimer();
        timer = window.setTimeout(() => {
          timer = null;
          if (isVisible()) playAnim();
        }, BREAK_MS);
      });
    }

    // rect-based visibility gate — same listener trio as lib/lazyvideo
    // (deliberately NOT IntersectionObserver; see that module's header)
    const update = () => {
      const vh = window.innerHeight;
      const r = el.getBoundingClientRect();
      const near = r.bottom > -vh && r.top < vh * 2; // ±1 viewport preload
      const visible = r.bottom > 0 && r.top < vh;
      if (near && !loaded) {
        loaded = true;
        for (const v of all) {
          v.preload = "auto";
          v.load();
        }
        statics.forEach(parkStatic);
      }
      if (visible && !wasVisible) {
        // arrival / every re-entry: the anim fires immediately, then the
        // ended-handler above restarts the 15s cadence
        playAnim();
      } else if (!visible && wasVisible) {
        // offscreen: freeze the cycle (timer + playback), reset the anim
        // layer so re-entry starts from a clean static hold
        clearTimer();
        for (const v of anims) {
          if (!v.paused) v.pause();
          v.style.transition = "none";
          v.style.opacity = "0";
          if (v.currentTime > 0.001) v.currentTime = 0;
        }
      }
      wasVisible = visible;
    };

    lenis.on("scroll", update);
    window.addEventListener("scroll", update, { passive: true });
    ScrollTrigger.addEventListener("refresh", update);
    update();
  },
};
