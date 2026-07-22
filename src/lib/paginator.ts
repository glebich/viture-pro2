/** Fixed left-edge section paginator: dots taper away from the active
 *  position, which renders as an orange dash — mirrors the Figma component
 *  (viewBox 0 0 8 114, dot radii 2/1.5/1, accent #FF5F34).
 *
 *  Interactive since client round 8: each slot is a 19px hit-area button —
 *  hover grows the dot (transform-only, no layout shift), click navigates
 *  to that section (the caller supplies the scroll behaviour). Built as DOM
 *  elements instead of one <svg> so every slot gets a generous hit target.
 *  The id list is swappable at runtime: after the s01 loader retires, dot 0
 *  maps to the s02 home. */
import "../styles/paginator.css";

export interface Paginator {
  /** highlight the slot at `index` within the current id list */
  setPage(index: number): void;
  /** replace the section id list (resets the highlight cache) */
  setIds(ids: string[]): void;
}

const SLOT = 19; // px between slot centres, from the 114px/6-gap design

export function mountPaginator(
  sectionIds: string[],
  navigate: (sectionId: string) => void
): Paginator {
  let ids = sectionIds.slice();
  const el = document.createElement("div");
  el.id = "paginator";
  const mq = window.matchMedia("(max-width: 640px)");
  const applyMq = () => (el.style.display = mq.matches ? "none" : "block");
  mq.addEventListener("change", applyMq);
  applyMq();
  document.body.appendChild(el);

  // Track the stage's cover-crop so the dots hug the design's 40px offset
  // but never slide over section text when the viewport crops the stage
  // (design-space 40px sits inside the crop zone on narrow windows).
  function place() {
    const s = Math.max(window.innerWidth / 1920, window.innerHeight / 1080);
    const cropLeft = (window.innerWidth - 1920 * s) / 2; // ≤ 0 when cropped
    el.style.left = `${Math.max(12, cropLeft + 40 * s)}px`;
  }
  place();
  window.addEventListener("resize", place);

  // one persistent delegated listener — render() rebuilds the slots
  el.addEventListener("click", (e) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>(".pg-slot")
      ?.dataset.id;
    if (id) navigate(id);
  });

  let current = -1;

  function render(index: number) {
    if (index === current) return;
    current = index;
    // window of 7 slots centred on the active section; slot centres match
    // the old svg's dot centres ((off+3)*SLOT + 1), buttons are 19x19
    const rows: string[] = [];
    for (let off = -3; off <= 3; off++) {
      const i = index + off;
      const top = (off + 3) * SLOT + 1 - SLOT / 2;
      if (i < 0 || i >= ids.length) continue;
      if (off === 0) {
        // active dash: clicking it re-targets its own section — harmless
        rows.push(
          `<button type="button" class="pg-slot" data-id="${ids[i]}" style="top:${top}px" aria-label="Current section" aria-current="true"><span class="pg-dash"></span></button>`
        );
      } else {
        const r = Math.abs(off) === 1 ? 2 : Math.abs(off) === 2 ? 1.5 : 1;
        rows.push(
          `<button type="button" class="pg-slot" data-id="${ids[i]}" style="top:${top}px" aria-label="Go to section ${i + 1}"><span class="pg-dot" style="width:${2 * r}px;height:${2 * r}px"></span></button>`
        );
      }
    }
    el.innerHTML = rows.join("");
  }

  render(0);
  return {
    setPage: render,
    setIds(next: string[]) {
      ids = next.slice();
      current = -1; // force a re-render on the next setPage
    },
  };
}
