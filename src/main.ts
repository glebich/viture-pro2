import "./styles/base.css";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Section, SectionCtx } from "./lib/section";
import { sections } from "./sections";
import { header } from "./sections/header";
import { mountPaginator } from "./lib/paginator";
import { mountScrollHint } from "./lib/scrollhint";
import { createFluid, SECTION_PALETTES, SECTION_CALMS } from "./lib/fluid";
import type { FluidBlend } from "./lib/fluid";
import { mountSnap } from "./lib/snap";
// imported after the section modules so its base-fill overrides land last
import "./styles/fluid.css";

gsap.registerPlugin(ScrollTrigger);

// ---------------------------------------------------------------------------
// Safari/WebKit detection — gates the offscreen-culling fallback below and
// the `.safari` CSS caps (reduced backdrop-filter radii etc). UA-based on
// purpose: the WebKit quirks we work around aren't feature-detectable.
// ---------------------------------------------------------------------------
const isWebKit =
  /AppleWebKit/i.test(navigator.userAgent) &&
  !/Chrome|CriOS|Chromium|Edg\//i.test(navigator.userAgent);
if (isWebKit) document.documentElement.classList.add("safari");

// always start at the top — the loader/hero sequence assumes it, and
// Chrome's scroll restoration otherwise drops reloads mid-page with
// entrance states half-applied
history.scrollRestoration = "manual";
window.scrollTo(0, 0);

// Feel target (client round 6): the round-4 duration/easing config built
// momentum the user couldn't cancel — every wheel notch replayed a full
// 0.95s ease curve, so scroll "kept going" after input stopped. Lerp mode
// instead tracks the target position exponentially: the moment input stops
// the remaining distance collapses, so a notch settles in ~0.5s and a flick
// stays catchable (rejouice-style heavy-but-controlled smoothing).
const lenis = new Lenis({
  lerp: 0.12,
  wheelMultiplier: 0.95,
  smoothWheel: true,
});

const resetToTop = () => {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  lenis.scrollTo(0, { immediate: true, force: true });
};
// Some browsers restore scroll after early startup code has already run.
// Re-assert top-of-page on load/pageshow so a reload always restarts the
// landing from the intro instead of replaying animations mid-page.
requestAnimationFrame(() => requestAnimationFrame(resetToTop));
window.addEventListener("load", resetToTop, { once: true });
window.addEventListener("pageshow", resetToTop);
window.addEventListener("beforeunload", () => {
  history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
});

lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

const ctx: SectionCtx = { gsap, ScrollTrigger, lenis };

// dev-only debug handle for the Playwright QA scripts (scrollcheck/snap and
// ad-hoc probes need lenis.limit + trigger geometry from the page context)
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__viture = {
    lenis,
    gsap,
    ScrollTrigger,
  };
}

// ---------------------------------------------------------------------------
// ScrollTrigger refreshes triggers in CREATION order, and pin-spacer offsets
// accumulate in that same order. s06 builds its pinned timeline late (after
// document.fonts.load resolves), so without sorting, every trigger below it
// measured positions WITHOUT s06's 5400px pin spacer — s22's pin engaged a
// full spacer-height early, its carousel played out hidden behind s20/s21,
// and the real s21→s22 fold showed 4 viewports of empty ambient canvas
// (blending toward s23's dark palette = the "black page"). Re-sorting by
// live document position on every refresh keeps late-created triggers
// correct no matter when they appear.
// ---------------------------------------------------------------------------
ScrollTrigger.addEventListener("refreshInit", () => void ScrollTrigger.sort());

// Keep the unitless .stage cover-scale factor in sync with the viewport.
// --stage-w/--stage-h come from CSS so breakpoints stay CSS-driven.
function syncStageScale() {
  const cs = getComputedStyle(document.documentElement);
  const w = parseFloat(cs.getPropertyValue("--stage-w")) || 1920;
  const h = parseFloat(cs.getPropertyValue("--stage-h")) || 1080;
  const s = Math.max(window.innerWidth / w, window.innerHeight / h);
  document.documentElement.style.setProperty("--s", String(s));
}
syncStageScale();
window.addEventListener("resize", () => {
  syncStageScale();
  ScrollTrigger.refresh();
});

const headerEl = document.getElementById("site-header")!;
headerEl.innerHTML = header.html;
header.init?.(headerEl, ctx);

// QA harness (dev): ?only=s22[&progress=0.5] mounts a single section at
// scroll 0 — the embedded-browser screenshotter can't capture scrolled pages.
const qaParams = new URLSearchParams(location.search);
const qaOnly = import.meta.env.DEV ? qaParams.get("only") : null;
const qaSections = qaOnly
  ? (sections as Section[]).filter((s) => s.id === qaOnly)
  : (sections as Section[]);

const mainEl = document.getElementById("sections")!;
// perf round: below-fold sections get loading="lazy" decoding="async"
// stamped into their <img> tags BEFORE innerHTML parses them — otherwise
// the browser starts fetching all ~36MB of section imagery at load. The
// above-fold set stays eager: s01/s02 are the opening viewport and s03's
// product renders gate the glass shader's texture build (imageReady), so
// deferring them would delay the etch to a near-arrival flash. Browsers
// begin fetching lazy images 1–2 viewports out, well ahead of any pinned
// choreography that needs them.
const EAGER = new Set(["s01", "s02", "s03"]);
// Videos also lose the autoplay ATTRIBUTE below the fold: Chrome fetches
// autoplay-attributed media aggressively (often in full) even far
// offscreen. Playback isn't affected — lib/lazyvideo and each section's
// own choreography call play() explicitly on proximity/visibility; the
// attribute only served as a declarative fallback.
const lazyImgs = (html: string) =>
  html
    .replace(/<img(?![^>]*\bloading=)/g, '<img loading="lazy" decoding="async"')
    .replace(/(<video\b[^>]*?)\sautoplay/g, "$1");
for (const s of qaSections) {
  const el = document.createElement("section");
  el.className = "screen";
  el.id = s.id;
  el.innerHTML = EAGER.has(s.id) ? s.html : lazyImgs(s.html);
  mainEl.appendChild(el);
}
// init after all are in the DOM so cross-section triggers can resolve
for (const s of qaSections) {
  const el = document.getElementById(s.id)!;
  s.init?.(el, ctx);
}

if (qaOnly) {
  const p = parseFloat(qaParams.get("progress") ?? "");
  if (!Number.isNaN(p)) {
    // force every scrubbed/pinned timeline in the section to a fixed progress
    requestAnimationFrame(() => {
      ScrollTrigger.getAll().forEach((st) => {
        // only freeze scrubbed (pinned-state) timelines; entrance
        // animations must play out normally or sections snap at opacity 0
        if (!st.vars.scrub) return;
        st.disable(false);
        const anim = st.animation;
        if (anim) anim.progress(p).pause();
      });
    });
  }
  lenis.stop();
}

// ---------------------------------------------------------------------------
// Global ambient fluid gradient — one persistent canvas fixed behind all
// sections; palette keyframes (per section id) blend continuously with scroll
// so the whole landing reads as a single connected fluid animation.
// ---------------------------------------------------------------------------
const fluidCanvas = document.createElement("canvas");
fluidCanvas.id = "fluid-bg";
document.body.prepend(fluidCanvas);

const fluidIds = qaSections.map((s) => s.id).filter((id) => SECTION_PALETTES[id]);
let fluidCenters: { id: string; c: number }[] = [];
function measureFluidCenters() {
  const y = window.scrollY;
  fluidCenters = fluidIds.map((id) => {
    const el = document.getElementById(id)!;
    // pinned sections translate inside their pin-spacer — measure the spacer,
    // which stays in normal flow, so palette centers span the pinned range
    const box =
      el.parentElement?.classList.contains("pin-spacer")
        ? el.parentElement
        : el;
    const r = box.getBoundingClientRect();
    return { id, c: y + r.top + r.height / 2 };
  });
}
ScrollTrigger.addEventListener("refresh", measureFluidCenters);

const smooth01 = (x: number) =>
  x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);

function ambientBlend(): FluidBlend {
  // QA harness: single section mounted → hold its palette statically
  if (qaOnly) {
    const key = SECTION_PALETTES[qaOnly] ? qaOnly : "s01";
    return { from: key, to: key, mix: 0 };
  }
  const n = fluidCenters.length;
  if (!n) return { from: "s01", to: "s01", mix: 0 };
  const mid = window.scrollY + window.innerHeight / 2;
  if (mid <= fluidCenters[0].c)
    return { from: fluidCenters[0].id, to: fluidCenters[0].id, mix: 0 };
  for (let i = 0; i < n - 1; i++) {
    const a = fluidCenters[i];
    const b = fluidCenters[i + 1];
    if (mid <= b.c) {
      const raw = (mid - a.c) / Math.max(1, b.c - a.c);
      return { from: a.id, to: b.id, mix: smooth01(raw) };
    }
  }
  return { from: fluidCenters[n - 1].id, to: fluidCenters[n - 1].id, mix: 0 };
}

createFluid(fluidCanvas, {
  palettes: SECTION_PALETTES,
  calms: SECTION_CALMS,
  getBlend: ambientBlend,
});

// ---------------------------------------------------------------------------
// WebKit offscreen-section culling. base.css relies on
// `content-visibility: auto` to keep offscreen sections unpainted, but
// Safari/WebKit doesn't reliably skip painting them — it keeps rasterizing
// dozens of 75-150px blur layers and tanks scroll to ~20fps. Fallback:
// an IntersectionObserver (±1.5 viewport margin) sets `visibility: hidden`
// on far-offscreen sections. Layout is untouched, so scroll geometry and
// ScrollTrigger positions are unaffected.
//
// Pinned-section safety: while a section is pinned it sits inside the
// viewport (GSAP transforms it within its pin-spacer), so the observer sees
// it as intersecting and never hides it. As a belt-and-braces guard we also
// refuse to hide any section whose pinning ScrollTrigger is active.
// ---------------------------------------------------------------------------
if (isWebKit && !qaOnly && !qaParams.has("nocull")) {
  // Scroll-driven rather than IntersectionObserver: GSAP reparents pinned
  // sections into pin-spacers after observation starts, which WebKit's IO
  // handles inconsistently (spacered sections were never re-evaluated).
  //
  // Each scroll frame we read every section's *rendered* rect and hide the
  // ones further than 1.5 viewports away. Using the live rect (rather than
  // cached document-space ranges) is what makes this pin-safe: a pinned
  // section is position-fixed inside the viewport, so its rect keeps it
  // visible for exactly as long as GSAP holds it on screen — several pins
  // here engage outside their spacer's flow range, so geometry caching
  // would mis-hide them. 21 rect reads on a clean layout are cheap (no
  // forced reflow: ScrollTrigger's scroll handler runs before this one,
  // so styles are already settled).
  const CULL_MARGIN = 1.5;
  const screens = Array.from(
    document.querySelectorAll<HTMLElement>("section.screen")
  );
  const applyCull = () => {
    const vh = window.innerHeight;
    for (const el of screens) {
      const r = el.getBoundingClientRect();
      const want =
        r.bottom < -vh * CULL_MARGIN || r.top > vh * (1 + CULL_MARGIN)
          ? "hidden"
          : "";
      if (el.style.visibility !== want) el.style.visibility = want;
    }
  };
  ScrollTrigger.addEventListener("refresh", applyCull);
  // native scroll events cover momentum tails after Lenis settles
  window.addEventListener("scroll", applyCull, { passive: true });
  lenis.on("scroll", applyCull);
}

// Velocity-reactive stage parallax (round 8 — replaced the round-6 skew:
// the shear read as "images aren't straight"). Skipped in the ?only= QA
// harness — screenshots there must be transform-pristine (scrollfx also
// self-gates on touch + prefers-reduced-motion).
// Section magnetism (client round 11): when the scroll rests with a fold
// mid-viewport near a section boundary, glide onto the boundary so every
// screen presents full-frame — see src/lib/snap.ts for the full contract.
// Skipped in the ?only QA harness and with ?nosnap (QA scripts drive
// window.scrollTo natively, which never arms it anyway).
if (!qaOnly && !qaParams.has("nosnap")) mountSnap(lenis, gsap);

mountScrollHint();
const paginator = mountPaginator(
  (sections as Section[]).map((s) => s.id),
  (id) => {
    const target = document.getElementById(id);
    if (target) lenis.scrollTo(target, { duration: 1.2 });
  }
);
// pageOffset shifts trigger indices onto the paginator's id list once the
// s01 loader retires (below) and dot 0 becomes the s02 home
let pageOffset = 0;
let lastPage = 0;
const trackPage = (i: number) => {
  lastPage = i;
  paginator.setPage(Math.max(0, i - pageOffset));
};
(sections as Section[]).forEach((s, i) => {
  ScrollTrigger.create({
    trigger: `#${s.id}`,
    start: "top center",
    end: "bottom center",
    onToggle: (self) => self.isActive && trackPage(i),
  });
});

// ---------------------------------------------------------------------------
// Loader retirement (client round 8): once the intro lands on the s02 home,
// the s01 loader must be gone for good — scrolling back up stops at s02's
// top. s01 dispatches "s01:retire" exactly when the scroll rests at/past
// s02's top (auto-glide completion, or the equivalent resting point if the
// visitor took over), so subtracting s01's height from the scroll position
// in the same frame shows the identical pixels — no visible hop. The event
// never fires in the ?only QA harness (no #s02 mounted there), so s01 keeps
// rendering normally for QA.
// ---------------------------------------------------------------------------
window.addEventListener(
  "s01:retire",
  () => {
    const s01el = document.getElementById("s01");
    if (!s01el) return;
    const h = s01el.offsetHeight;
    // capture the resting scroll BEFORE the removal: once s01 is gone the
    // browser may clamp the native position against the shrunken document
    // (always when resting inside the s27 finale pin — the doc end moves up
    // by exactly h), and any post-removal read would double-count that
    const y0 = lenis.scroll ?? window.scrollY;
    // kill anything scroll-bound to s01 (its paginator trigger, scrubbed
    // tweens, entrance timelines) before the element leaves the document
    ScrollTrigger.getAll().forEach((st) => {
      const t = st.trigger;
      if (t instanceof Element && (t === s01el || s01el.contains(t)))
        st.kill();
    });
    // drop s01 from the ambient palette keyframes — measureFluidCenters
    // must never look up the removed element
    const fi = fluidIds.indexOf("s01");
    if (fi >= 0) fluidIds.splice(fi, 1);
    s01el.remove();
    // Lenis's own ResizeObserver is debounced — until it fires, its scroll
    // limit is the PRE-removal document height, so wheel input near the
    // bottom targets up to h px past the real end (phantom overscroll that
    // must unwind before up-scrolling responds). lenis.resize() re-measures
    // synchronously AND snaps animated/target scroll to the live native
    // position, so the -h compensation below starts from truth. (Native
    // scroll is deterministic here only because base.css sets
    // overflow-anchor: none — Chrome's scroll anchoring otherwise applies
    // its own unpredictable -h adjustment on the removal, double-shifting.)
    lenis.resize();
    // same-frame compensation: everything above the viewport just shrank by
    // exactly h, so shifting the pre-removal scroll by -h is visually a
    // no-op (and always lands within the new, shorter document)
    lenis.scrollTo(Math.max(0, y0 - h), {
      immediate: true,
      force: true,
    });
    pageOffset = 1;
    paginator.setIds(
      (sections as Section[]).filter((s) => s.id !== "s01").map((s) => s.id)
    );
    paginator.setPage(Math.max(0, lastPage - 1));
    ScrollTrigger.refresh();
  },
  { once: true }
);

ScrollTrigger.refresh();
