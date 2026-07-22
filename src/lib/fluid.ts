// ---------------------------------------------------------------------------
// fluid.ts — lightweight WebGL2 fragment-shader fluid gradient renderer.
// Zero dependencies. Single-pass domain-warped simplex fbm blending four
// color stops (two warp passes + a low-amplitude high-frequency detail
// octave + subtle in-palette hue drift), rendered at full resolution up to
// DPR 1.5 on Blink (reduced on WebKit) with a temporally-stable film grain
// to prevent banding. Pauses when the tab is hidden. A per-palette `calm`
// factor (SECTION_CALMS) tames the warp + detail octave in zones that must
// read as elegant gradient drift rather than liquid marble.
// ---------------------------------------------------------------------------

export type FluidPalette = readonly [string, string, string, string];

/** A scroll-driven interpolation between two keyed palettes. */
export interface FluidBlend {
  from: string;
  to: string;
  /** 0 → pure `from`, 1 → pure `to` */
  mix: number;
}

export interface FluidOptions {
  /** keyed color sets (4 stops each) */
  palettes: Record<string, FluidPalette>;
  /** called every frame; returns which two palettes to interpolate */
  getBlend: () => FluidBlend;
  /** drift speed multiplier (1 = default slow ambient) */
  speed?: number;
  /** grain amplitude in [0,1] color units (default 0.028) */
  grain?: number;
  /** per-palette calm factor (0–1, default 0), keyed like `palettes` and
   *  interpolated with the palette blend: 0 keeps the full domain-warped
   *  marble character, 1 nearly flattens the warp + detail octave so the
   *  zone reads as a slow elegant gradient drift instead of liquid marble */
  calms?: Record<string, number>;
}

export interface FluidHandle {
  canvas: HTMLCanvasElement;
  destroy(): void;
}

// ---------------------------------------------------------------------------
// Per-section ambient palette keyframes (keyed by section id). The scroll
// driver in main.ts interpolates between adjacent sections so the whole
// landing reads as one continuous fluid gradient.
// ---------------------------------------------------------------------------

// s01 rests on the loader's end state — a slightly brighter navy that eases
// into DEEP_NAVY by s02, so loader → hero reads as one continuous ambient
const NAVY_DAWN: FluidPalette = ["#04060d", "#0c1c46", "#16307c", "#2a1160"];
const DEEP_NAVY: FluidPalette = ["#04060d", "#0b1533", "#122b66", "#2a0b5c"];
const DARK_VIOLET: FluidPalette = ["#080312", "#170b30", "#2a005c", "#0e0620"];
// round 7 ("design is wrong, no gradient"): the two dark stops sat far below
// the design's #ff692c field — through s11's translucent base fill they
// dragged the luminous glow composition ~15–20% darker/muddier. The stops now
// stay inside the design's own glow family (#ff692c → #a63a12 deepest).
const VIVID_ORANGE: FluidPalette = ["#ff692c", "#ff8f4d", "#e85615", "#a63a12"];
const EMBER_ORANGE: FluidPalette = ["#ff692c", "#ffa668", "#c2440e", "#5c1c04"];
const DARK_NEUTRAL: FluidPalette = ["#040404", "#101113", "#1d1f22", "#0a0b0d"];
const ICE_BLUE: FluidPalette = ["#cedae3", "#bcedff", "#9fc6dd", "#e4eef5"];
const LIGHT_BLUE: FluidPalette = ["#e8f1f7", "#cedae3", "#bcedff", "#a9cde4"];
const WARM_DARK: FluidPalette = ["#0a0503", "#22100a", "#4a1e0c", "#120806"];

export const SECTION_PALETTES: Record<string, FluidPalette> = {
  s01: NAVY_DAWN,
  s02: DEEP_NAVY,
  s03: DEEP_NAVY,
  s04: DEEP_NAVY,
  s05: DEEP_NAVY,
  s06: DARK_VIOLET,
  s07: DARK_VIOLET,
  s08: DARK_VIOLET,
  // s09, s13, s19 removed per client review — keys dropped with them
  // (s18 restored in client round 10, see below)
  // s10 removed per client review round 6 — final (key dropped with it)
  s11: VIVID_ORANGE, // s12 merged into s11 (round 5) — one key for the pinned page
  s14: DARK_NEUTRAL,
  s15: DARK_NEUTRAL, // s16 merged into s15 (round 5) — one key for the pinned page
  s16b: DARK_NEUTRAL, // s17 merged into s16b (round 5) — one key for the pinned page // laser light-path video interstitial (client round 12)
  s18: DARK_NEUTRAL, // WOMAN portrait interstitial — restored (client round 10)
  s20: ICE_BLUE,
  s21: ICE_BLUE,
  s22: LIGHT_BLUE,
  s23: WARM_DARK,
  s24: WARM_DARK,
  s25: WARM_DARK,
  s26: WARM_DARK,
  s27: WARM_DARK, // s28 merged into s27 (round 7) — one key for the pinned page
};

/** Per-palette-zone calm factor (0–1), keyed by section id and interpolated
 *  with the palette blend by the renderer. Round 7: the orange diopter zone
 *  (s11) read as busy liquid marble behind the design's luminous glow —
 *  calm 0.7 flattens most of the warp/detail there so it drifts as one slow
 *  elegant gradient. Unlisted sections default to 0 (full marble). */
export const SECTION_CALMS: Record<string, number> = {
  s11: 0.7,
};

/** Loader palettes (s01 veil): orange → navy. LOADER_DEEP must equal the
 *  global s01 keyframe so the veil hands off to the ambient canvas
 *  invisibly and the field then flows into s02's DEEP_NAVY. */
export const LOADER_WARM: FluidPalette = [
  "#ffe9cf",
  "#ff9a55",
  "#ff692c",
  "#a63a12",
];
export const LOADER_DEEP: FluidPalette = NAVY_DAWN;

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const VERT = `#version 300 es
void main() {
  // fullscreen triangle from gl_VertexID — no buffers needed
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
//__DEFINES__
precision highp float;
out vec4 outColor;

uniform vec2 uRes;
uniform float uTime;
uniform float uGrain;
uniform float uCalm;
uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;

// --- 2D simplex noise (Ashima Arts / Ian McEwan, MIT) -----------------------
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.62;
  for (int i = 0; i < 3; i++) {
    v += a * snoise(p);
    p = p * 1.9 + vec2(7.3, 3.1);
    a *= 0.38;
  }
  return v;
}

void main() {
  // centered, aspect-corrected coords
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  float t = uTime;

  // per-zone calm: 0 = full marble character, 1 = nearly unwarped drift.
  // Scales the warp amplitudes and the detail octave's weight below.
  float wk = 1.0 - 0.72 * uCalm;

  // two-pass domain warp — slow organic drift, low frequency so the
  // shapes stay broad and calm (no busy marbling)
  vec2 q = vec2(
    fbm(p * 0.62 + vec2(0.0, 0.05 * t)),
    fbm(p * 0.62 + vec2(5.2, 1.3) - vec2(0.04 * t, 0.018 * t))
  );
  vec2 r = vec2(
    fbm(p * 0.62 + 1.1 * wk * q + vec2(1.7, 9.2) + vec2(0.07 * t, 0.026 * t)),
    fbm(p * 0.62 + 1.1 * wk * q + vec2(8.3, 2.8) - vec2(0.024 * t, 0.055 * t))
  );
  float f = fbm(p * 0.62 + 1.25 * wk * r);

#ifdef DETAIL
  // third, higher-frequency detail octave riding the same warp — gives the
  // field fine internal structure (silk, not mush) at low amplitude
  float d2 = fbm(p * 2.35 + 2.1 * wk * r + vec2(0.021 * t, -0.016 * t));
  f += 0.22 * (1.0 - 0.85 * uCalm) * d2;
#endif

  float n = clamp(f * 0.5 + 0.5, 0.0, 1.0);

  vec3 col = mix(uC0, uC1, smoothstep(0.0, 0.85, n));
  col = mix(col, uC2, smoothstep(0.2, 1.0, 0.5 + 0.5 * q.x));
  col = mix(col, uC3, smoothstep(0.45, 1.05, 0.5 + 0.5 * r.y) * 0.8);

#ifdef DETAIL
  // subtle in-palette hue drift — the field slides between neighbouring
  // stops instead of holding one flat mix, so big areas never go murky
  float hd = 0.5 + 0.5 * snoise(p * 1.15 + 0.8 * r + vec2(0.013 * t, 0.009 * t));
  col = mix(col, mix(uC1, uC2, hd), 0.10);
  col = mix(col, uC3, 0.06 * smoothstep(0.25, 0.9, 0.5 + 0.5 * d2));
#endif

  // fine grain — breaks up banding on shallow gradients. Static seed:
  // a stable film-grain pattern, no per-frame shimmer.
  float seed = dot(gl_FragCoord.xy, vec2(12.9898, 78.233));
  col += (fract(sin(seed) * 43758.5453) - 0.5) * uGrain;

  outColor = vec4(col, 1.0);
}`;

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  let h = hex.replace("#", "");
  if (h.length === 3)
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`fluid shader compile failed: ${log}`);
  }
  return sh;
}

export function createFluid(
  canvas: HTMLCanvasElement,
  opts: FluidOptions
): FluidHandle {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });

  // no WebGL2 → inert handle; the page just falls back to its solid colors
  if (!gl) return { canvas, destroy() {} };

  // Capability probe: software rasterizers (SwiftShader/llvmpipe — headless
  // CI, VMs, GPU-blocklisted machines) can't afford the full-res buffer or
  // the detail octave; real GPUs take both easily. Re-run after a context
  // restore — a GPU-process reset can hand the page a different rasterizer.
  const probeSoftwareGL = () => {
    try {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      const r = String(
        gl.getParameter(
          ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER,
        ) ?? "",
      );
      return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r);
    } catch {
      return false;
    }
  };

  // GL program state — (re)built by buildProgram so a lost-then-restored
  // context comes back with the SAME quality tier (DETAIL define, uniform
  // locations) instead of a dead or degraded pipeline.
  let uRes: WebGLUniformLocation | null = null;
  let uTime: WebGLUniformLocation | null = null;
  let uGrain: WebGLUniformLocation | null = null;
  let uCalm: WebGLUniformLocation | null = null;
  let uC: Array<WebGLUniformLocation | null> = [];
  const calms = opts.calms ?? {};

  function buildProgram(softwareGL: boolean) {
    const prog = gl!.createProgram()!;
    gl!.attachShader(prog, compile(gl!, gl!.VERTEX_SHADER, VERT));
    gl!.attachShader(
      prog,
      compile(
        gl!,
        gl!.FRAGMENT_SHADER,
        FRAG.replace("//__DEFINES__", softwareGL ? "" : "#define DETAIL 1"),
      ),
    );
    gl!.linkProgram(prog);
    if (!gl!.getProgramParameter(prog, gl!.LINK_STATUS))
      throw new Error(
        `fluid program link failed: ${gl!.getProgramInfoLog(prog)}`,
      );
    gl!.useProgram(prog);
    uRes = gl!.getUniformLocation(prog, "uRes");
    uTime = gl!.getUniformLocation(prog, "uTime");
    uGrain = gl!.getUniformLocation(prog, "uGrain");
    uCalm = gl!.getUniformLocation(prog, "uCalm");
    uC = [0, 1, 2, 3].map((i) => gl!.getUniformLocation(prog, `uC${i}`));
  }

  // pre-parse palettes
  const pals: Record<string, RGB[]> = {};
  for (const [k, v] of Object.entries(opts.palettes)) pals[k] = v.map(hexToRgb);
  const fallback = Object.values(pals)[0] ?? [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  const reduced =
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  const speed = (opts.speed ?? 1) * (reduced ? 0.15 : 1);
  const grain = opts.grain ?? 0.028;

  // Render resolution (client round 5 — "ambient must be crisp, premium"):
  // Blink/Gecko on a real GPU get FULL resolution up to DPR 1.5 — the
  // 0.66× buffer's bilinear upscale was the source of the soft JPEG-like
  // macro-blocking. The fragment shader stays cheap enough (≤21 snoise/px)
  // that capable desktop GPUs hold 60fps at 1920×1080×1.5. Software GL
  // (headless/CI/blocklisted) keeps the old 0.66× budget + the plain
  // 3-octave shader, so the scroll harness numbers hold.
  // Safari/WebKit (html.safari, set by main.ts): unchanged 0.5× at dpr 1 —
  // WebKit rasterizes this shader far slower and composites the upscale
  // for free.
  const isSafari = document.documentElement.classList.contains("safari");
  let RES_SCALE = 1;
  let DPR_CAP = 1.5;
  function applyCaps(softwareGL: boolean) {
    RES_SCALE = isSafari ? 0.5 : softwareGL ? 0.66 : 1;
    DPR_CAP = isSafari ? 1 : 1.5;
  }

  function resize(force = false) {
    if (!gl || gl.isContextLost()) return;
    // Guard against degenerate/transient rects (mid-refresh layout states):
    // the canvas is a fixed full-viewport layer, so never size the buffer
    // below the live viewport — a shrunken buffer upscales into the exact
    // "coarse blocky noise" degradation flagged in round 8.
    const rect = canvas.getBoundingClientRect();
    const cw = rect.width >= 2 ? rect.width : window.innerWidth;
    const ch = rect.height >= 2 ? rect.height : window.innerHeight;
    const s = Math.min(window.devicePixelRatio || 1, DPR_CAP) * RES_SCALE;
    const w = Math.max(2, Math.round(cw * s));
    const h = Math.max(2, Math.round(ch * s));
    if (force || canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  // (re)initialize the full GL pipeline — also the context-restore path
  function setup() {
    const softwareGL = probeSoftwareGL();
    applyCaps(softwareGL);
    buildProgram(softwareGL);
    resize(true);
  }
  setup();
  const onResize = () => resize();
  window.addEventListener("resize", onResize);

  let phase = 0;
  let last = performance.now();
  let raf = 0;
  let destroyed = false;

  const mixed: RGB = [0, 0, 0];
  function draw(now: number) {
    if (!gl || destroyed) return;
    raf = requestAnimationFrame(draw);
    // a lost context silently ignores GL calls — skip until "restored"
    // re-runs setup() (prevents both error spam and stale-buffer frames)
    if (gl.isContextLost()) return;
    phase += Math.min(100, now - last) * 0.001 * speed;
    last = now;

    const b = opts.getBlend();
    const a = pals[b.from] ?? fallback;
    const z = pals[b.to] ?? fallback;
    const m = Math.min(1, Math.max(0, b.mix));

    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, phase);
    gl.uniform1f(uGrain, grain);
    const ca = calms[b.from] ?? 0;
    gl.uniform1f(uCalm, ca + ((calms[b.to] ?? 0) - ca) * m);
    for (let i = 0; i < 4; i++) {
      mixed[0] = a[i][0] + (z[i][0] - a[i][0]) * m;
      mixed[1] = a[i][1] + (z[i][1] - a[i][1]) * m;
      mixed[2] = a[i][2] + (z[i][2] - a[i][2]) * m;
      gl.uniform3f(uC[i], mixed[0], mixed[1], mixed[2]);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  raf = requestAnimationFrame(draw);

  // Context loss/restore (GPU process reset, context-count eviction, driver
  // resets — accumulates over long scroll sessions). preventDefault marks
  // the context restorable; on restore the WHOLE pipeline is rebuilt at the
  // original quality tier (program + DETAIL define + full-res buffer).
  // Without this the canvas kept compositing a stale, garbage or shrunken
  // buffer — the round-8 "pixelated ambient" report.
  function onContextLost(e: Event) {
    e.preventDefault();
    cancelAnimationFrame(raf);
    raf = 0;
  }
  function onContextRestored() {
    if (destroyed) return;
    setup();
    last = performance.now();
    if (!raf && !document.hidden) raf = requestAnimationFrame(draw);
  }
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);

  // pause when the tab is hidden
  function onVisibility() {
    if (destroyed) return;
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(draw);
    }
  }
  document.addEventListener("visibilitychange", onVisibility);

  return {
    canvas,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
