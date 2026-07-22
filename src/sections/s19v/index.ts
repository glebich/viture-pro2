import "./style.css";
import type { Section } from "../../lib/section";
import { mountLazyVideo } from "../../lib/lazyvideo";

/* s19v — laser light-path interstitial (client round 12: "use laser-path
 * for the slide AFTER COMFORT"). Full-bleed client video: the temple laser
 * fires and paints the projected micro-OLED screen out of the dark — pure
 * optics narrative, sitting between the s16b comfort/sleek pin and the s18
 * portrait. No copy: the video carries the whole beat.
 *
 * Deliberately NOT `loop`: the clip is a one-shot build (black → beam →
 * full projected screen). Looping would snap the finished screen back to
 * darkness every 3.5s; instead it plays once as the visitor arrives
 * (playOnVisible) and holds its final frame — the completed projection —
 * which is also the poster shown under prefers-reduced-motion.
 */

const VIDEO = `<video
        class="s19v-video"
        autoplay
        muted
        playsinline
        preload="metadata"
        poster="/video/laser-poster.jpg"
        src="/video/laser-path.mp4"
        aria-label="Laser light path projecting the VITURE Pro 2 display"
      ></video>`;

export const s19v: Section = {
  id: "s19v",
  html: `
    <div class="stage stage--d">
      <div class="s19v-bg"></div>
      ${VIDEO}
    </div>
    <div class="stage stage--m">
      <div class="s19v-bg"></div>
      ${VIDEO}
    </div>`,
  init(el, ctx) {
    ctx.gsap
      .timeline({ scrollTrigger: { trigger: el, start: "top 78%" } })
      .from(el.querySelectorAll(".s19v-video"), {
        opacity: 0,
        duration: 1,
        ease: "power3.out",
      });
    mountLazyVideo(el, ctx, { playOnVisible: true });
  },
};
