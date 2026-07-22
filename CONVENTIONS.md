# Viture Pro 2 — Section Implementation Conventions

Read this fully before writing any section code.

## Architecture

- Vite + vanilla TypeScript. NO React, NO Tailwind. GSAP + ScrollTrigger + Lenis
  are set up in `src/main.ts` and passed to sections via `SectionCtx`.
- Each section lives in `src/sections/sXX/` (e.g. `s07`) with:
  - `index.ts` — exports `const sXX: Section = { id, html, init? }`
    (type from `src/lib/section.ts`). Import its own `style.css` at top.
  - `style.css` — all styles for this section, class-prefixed `.sXX-`.
- `src/sections/index.ts` aggregates: `export const sections = [s01, s02, …]`
  in visual order. Add your export there (file is pre-created; edit only your line).
- The site header is a standalone module `src/sections/header/` following the
  same pattern, rendered into `#site-header` (fixed overlay), not a section.

## Stage system (critical)

Sections are 100vh `.screen` elements. Inside, author EXACT design pixels on a
fixed canvas that is auto-scaled to cover the viewport (see `src/styles/base.css`):

```html
<div class="stage stage--d"> …desktop 1920×1080 markup, absolute px… </div>
<div class="stage stage--m"> …mobile 375×812 markup, absolute px… </div>
```

- Copy positions/sizes from the harvested Figma code 1:1 in px
  (`left: 132px; top: 204px; width: 460px; font-size: 92px; …`).
- Convert Tailwind utilities from the harvest .tsx into plain CSS.
  Common mappings: `inset-[a_b_c_d]` → `inset: a b c d`; `blur-[150px]` →
  `filter: blur(150px)`; `mix-blend-plus-lighter` → `mix-blend-mode: plus-lighter`;
  `backdrop-blur-[50px]` → `backdrop-filter: blur(50px)`;
  `bg-clip-text` gradient text → use `.gtx` utility with `--g` or the presets
  `.gtx--peach` (white→#FFD6AD→#EFA9B5), `.gtx--warm` (white→#FFDBBC),
  `.gtx--ice` (white→#BCEDFF), `.gtx--ink` (#010101→#330070).
- `-translate-x-1/2 left-1/2` → `left: 50%; transform: translateX(-50%)`.
- Figma `[text-box-trim]` props: approximate with `line-height: 1` (`.cap-trim`).

## Assets

- Compressed assets are in `public/assets/<bp>_<Screen-name>/<constant>.webp`
  (SVGs keep `.svg`). Reference as `/assets/1920_Screen-07-01/imgHero.webp`.
- The `manifest.json` in each harvest assets dir maps the .tsx constant names to
  files. Raster images were converted to `.webp` (same basename). Use the
  constant basename + `.webp`, or `.svg` for vectors. Verify the file exists
  (`ls public/assets/<dir>/`) — if a needed file is missing, note it in your
  final summary rather than inventing a path.
- DO NOT build the iOS Safari browser-chrome mockups (`TabsModeCompact`,
  SF Pro tab bars) that appear in mobile frames — they are Figma presentation
  chrome, not site UI. Same for the shared `Header375`/`Header1920` inside
  section frames: the global header module renders it; skip it in sections.
- Skip the left-edge vertical "paginator" SVG inside sections — it is a global
  fixed overlay handled separately.

## Motion

- Every section gets a tasteful entrance: use `init(el, ctx)` with
  `ctx.gsap.timeline({ scrollTrigger: { trigger: el, start: "top 70%" } })`
  fading/translating key layers (opacity 0→1, y 40→0, staggered, dur ~1,
  ease "power3.out"). Background glows can scale 1.05→1.
- Multi-state sections (given in your assignment) are PINNED with a scrubbed
  timeline: `scrollTrigger: { trigger: el, start: "top top", end: "+=150%"
  (per extra state), pin: true, scrub: 0.6 }`, cross-fading/sliding between
  states. Build all states inside the one section element.
- Keep all tweens scoped to elements inside your section.

## Quality bar

- Match the harvest screenshot (`harvest/shots/<bp>_<name>.png`) pixel-close.
- Real text as HTML text (never images) with exact font-size/weight/line-height,
  font "Season Sans" (already @font-face'd; weights 300–800).
- Type check must pass: `npx tsc --noEmit` clean for your files.
