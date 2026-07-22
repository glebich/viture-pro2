import type { SectionCtx } from "./section";

/* ---------------------------------------------------------------------------
 * lazyvideo.ts — shared lazy loader for full-bleed background <video> layers
 * (client round 12: laser-path / main-screen / sh2-slow).
 *
 * Contract:
 *  - The markup ships `<video autoplay muted loop playsinline
 *    preload="metadata" poster="…">`; this module gates the actual work.
 *  - prefers-reduced-motion: the video never loads or plays — autoplay is
 *    stripped before the browser can honor it and the poster frame shows.
 *  - Proximity: within ±1 viewport of the host section the video is
 *    upgraded to preload="auto", load()ed once, and play()ed; further away
 *    it is pause()d so far-offscreen sections cost zero decode. Re-pausing
 *    every far frame is deliberate: the `autoplay` attribute can fire its
 *    own play() whenever readyState catches up, and the next scroll tick
 *    must win that race.
 *  - Rect-based on purpose, NOT IntersectionObserver: GSAP reparents pinned
 *    sections into pin-spacers after observation starts, which WebKit's IO
 *    handles inconsistently (see the cull fallback in main.ts) — the same
 *    lenis/scroll/refresh listener trio as the s14/s16b ghost guards is
 *    used instead.
 *  - Videos inside a display:none stage (the inactive breakpoint) are held
 *    paused so the hidden twin never burns decode time. Both breakpoints
 *    reference the same file, so the visible one always has a warm cache.
 * ------------------------------------------------------------------------- */

export interface LazyVideoOptions {
  /** Start playback only when the section actually intersects the viewport
   *  (rather than the ±1-viewport preload zone). Used by the one-shot laser
   *  slide so the beam fires as the visitor arrives, not 1080px early. */
  playOnVisible?: boolean;
  /** Play through ONCE per viewport entry, then hold the final frame (no
   *  loop); each fresh entry restarts from 0. Used by the s14 sh2-slow
   *  drift — client: "plays and then just stops, not a loop". Strips the
   *  loop/autoplay attributes so this module owns the lifecycle. */
  playOnce?: boolean;
  /** Per-video play gate layered ON TOP of the proximity check: loading
   *  still follows section proximity for every video, but a video only
   *  plays while gate(v) is true — it pauses (without unloading) the tick
   *  the gate closes. Used by the s24 use-case carousel, where only the
   *  ACTIVE state's card video should burn decode time while the covered
   *  ones hold. Re-evaluated on every scroll/refresh tick and on whatever
   *  extra hooks the caller wires the returned updater into (e.g. a
   *  scrubbed timeline's onUpdate, so scrub catch-up after the last scroll
   *  event still settles play/pause correctly). */
  gate?: (v: HTMLVideoElement) => boolean;
}

/** Returns the update tick so callers with animation-driven gates can run it
 *  from extra hooks (a scrubbed timeline's onUpdate); no-op when reduced
 *  motion retired the videos, so wiring it unconditionally is safe. */
export function mountLazyVideo(
  host: HTMLElement,
  ctx: SectionCtx,
  opts: LazyVideoOptions = {},
): () => void {
  const noop = () => {};
  const videos = Array.from(host.querySelectorAll<HTMLVideoElement>("video"));
  if (!videos.length) return noop;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    // poster-only mode: kill autoplay before the fetch/play pipeline starts
    for (const v of videos) {
      v.autoplay = false;
      v.removeAttribute("autoplay");
      v.preload = "none";
      v.pause();
    }
    return noop;
  }

  if (opts.playOnce) {
    // this module owns the lifecycle: no loop, no browser-initiated autoplay
    for (const v of videos) {
      v.loop = false;
      v.removeAttribute("loop");
      v.autoplay = false;
      v.removeAttribute("autoplay");
    }
  }

  let loaded = false;
  let wasVisible = false;
  const update = () => {
    const vh = window.innerHeight;
    const r = host.getBoundingClientRect();
    const near = r.bottom > -vh && r.top < vh * 2; // ±1 viewport margin
    const visible = r.bottom > 0 && r.top < vh;
    const shouldPlay = opts.playOnVisible ? visible : near;
    for (const v of videos) {
      if (near && !loaded) {
        v.preload = "auto";
        v.load();
      }
      // offsetParent === null ⇒ inside the display:none breakpoint stage —
      // the hidden twin stays paused so it never burns decode time
      const active = v.offsetParent !== null;
      if (opts.playOnce) {
        // one shot per viewport entry: restart from 0 on the enter edge,
        // hold the last frame after 'ended' (no restart while it stays
        // visible), replay on the next fresh entry
        if (visible && !wasVisible && active) {
          v.currentTime = 0;
          v.play().catch(() => {});
        } else if (!visible && !v.paused) {
          v.pause();
        }
        continue;
      }
      if (shouldPlay && active && (!opts.gate || opts.gate(v))) {
        if (v.paused) v.play().catch(() => {});
      } else if (!v.paused) {
        v.pause();
      }
    }
    if (near) loaded = true;
    wasVisible = visible;
  };

  ctx.lenis.on("scroll", update);
  window.addEventListener("scroll", update, { passive: true });
  ctx.ScrollTrigger.addEventListener("refresh", update);
  update();
  return update;
}
