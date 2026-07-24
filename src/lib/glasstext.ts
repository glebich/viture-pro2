/* ---------- Transmission glass text (WebGL) ----------
 *
 * Renders a line of text as thick REFRACTIVE glass lying on a LIVE
 * background composition — the look of drei's MeshTransmissionMaterial
 * (ior refraction, chromatic dispersion, roughness blur, specular sheen)
 * rebuilt inside this project's custom WebGL1 pipeline. The glyphs are
 * rasterized once into a two-channel distance field:
 *
 *   R — CRISP signed distance (exact euclidean transform, one light
 *       smoothing pass). Used ONLY for pixel coverage + the hairline cut
 *       edge, so letterforms stay razor-sharp vector type.
 *   A — heavily LOWPASSED signed distance (wide 3-pass box blur). Used for
 *       everything volumetric: a parabolic "thickness" profile and its
 *       gradient give broad, liquid surface normals with zero
 *       high-frequency bevel noise.
 *
 * Look (client round 6 — "make it read as glass again, crisp, add VFX"):
 *   - ior-style refraction: the backdrop displacement is driven by the
 *     lowpassed thickness gradient (lens-like — biggest over the shoulders
 *     of the stroke, calm on the flat top) plus a slight slab shift and a
 *     thickness-weighted magnification about the glyph-row center.
 *   - chromatic aberration: background taps are distributed along the
 *     dispersion axis (per-channel displacement scale ~1±0.012) with
 *     gaussian RGB weights — MeshTransmissionMaterial-style fringing.
 *   - roughness blur: the same taps are jittered on a ring whose radius
 *     grows with thickness (thicker glass = softer transmission).
 *   - a broad specular sheen on light-facing shoulders + a brighter
 *     hairline on top edges + slight fresnel lift near the silhouette.
 *   - VFX: a wide diagonal light streak sweeps across the glyphs with
 *     scroll progress, and the refraction field's sample phase drifts with
 *     progress so the glass "flows" while the text travels.
 *   - the refracted sample is clamped to never fall below the underlying
 *     scene, so the glass always reads LIGHT (round-5 requirement kept).
 *
 * Crispness: the framebuffer runs at FULL stage resolution on Blink
 * (WebKit stays at 0.5× — html.safari — its rasterizer is slower and the
 * roughness blur hides the difference), coverage is antialiased over
 * ~0.75 framebuffer px straight from the crisp SDF channel, and the
 * background is composited at ≥1.0× design px so refracted product
 * renders stay sharp. Renders only on demand (uniform changes) and only
 * near the viewport (IntersectionObserver).
 *
 * `createGlassText` returns null when WebGL is unavailable so callers can
 * keep their CSS fallback text.
 */

export interface GlassLayer {
  /** Device render composited into the refraction background. A <video>
   *  or canvas source is drawn at its CURRENT content — callers drive
   *  re-uploads via `invalidateBg()` when it changes (round 17/18 live
   *  sequence layers, e.g. s03's scroll-scrubbed frame canvas). */
  image: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;
  /** Its base placement in design px: [x, y, w, h]. */
  rect: [number, number, number, number];
}

export interface GlassLayerState {
  alpha?: number;
  /** Design-px offset from the base rect. */
  dx?: number;
  dy?: number;
  /** Scale about the rect center. */
  scale?: number;
}

export interface GlassTextConfig {
  /** Canvas parent (positioned element in design-px space); also the
   *  IntersectionObserver target. */
  host: HTMLElement;
  /** Design-space size of the host stage. */
  stageW: number;
  stageH: number;
  text: string;
  fontFamily: string;
  fontWeight?: string;
  /** Design px. */
  fontSize: number;
  /** Optional alpha-mask image source; when present, the glass silhouette
   *  is built from this asset instead of rasterized text. */
  maskImage?: string | HTMLImageElement;
  /** Optional design-space size for `maskImage`. */
  maskWidth?: number;
  maskHeight?: number;
  /** Initial text center, design px. */
  x: number;
  y: number;
  /** Vertical background gradient stops [offset 0..1, cssColor]. */
  bgStops: Array<[number, string]>;
  /** Optional second gradient state — cross-faded over `bgStops` with
   *  `setBgMix` (product-swap veil changes read through the glass). */
  bgStopsB?: Array<[number, string]>;
  /** Product renders composited behind the glass (background only —
   *  the visible DOM copies live in the section markup). */
  layers: GlassLayer[];
  /** Offscreen buffer scale (default 1.0; 0.5 on WebKit). */
  resolution?: number;
  /** Constant slab offset seen through the glass body, design px. */
  shift?: number;
  /** Magnification of the backdrop inside the glyphs (default 1.045). */
  magnify?: number;
  /** SDF depth (design px) at which the glass reaches full thickness. */
  thick?: number;
  /** Peak lens displacement of the backdrop, design px (default 16). */
  refract?: number;
  /** Chromatic aberration: per-channel displacement scale spread
   *  (default 0.015 ≈ ±1.2% at the R/B weight centers). */
  ca?: number;
  /** Roughness blur radius at full thickness, design px. */
  frost?: number;
  /** Milky lift over the backdrop, 0..1 color units (default 0.03). */
  lift?: number;
  /** Hairline cut-edge width, design px (default 2). */
  edge?: number;
  /** Specular sheen strength on light-facing shoulders (default 0.3). */
  spec?: number;
  /** Fresnel brightening near the silhouette (default 0.05). */
  fresnel?: number;
  /** Travelling light-streak strength (default 0.14; 0 disables). */
  streak?: number;
  /** Cracked-crystal facet shear, design px (default 0 = classic liquid
   *  lens). Each voronoi facet shifts the backdrop in its own random
   *  direction so the glass reads as fractured crystal. */
  crack?: number;
  /** Facet cell size, design px (default fontSize * 0.5). */
  crackCell?: number;
  /** Fracture-border glint strength (default 0.16 when crack is on). */
  glint?: number;
  /** Refraction flow: design px the normal-sample phase drifts across the
   *  full scroll progress (default 30; 0 disables). */
  flow?: number;
  /** Fired once textures are built and the first frame rendered. */
  onReady?: () => void;
}

export interface GlassText {
  readonly canvas: HTMLCanvasElement;
  /** Mark the live background composition stale (a video layer presented
   *  a new frame) and redraw. Cheap: one 2D composite + texSubImage2D +
   *  the scissored fullscreen pass — call at most once per video frame. */
  invalidateBg(): void;
  /** Move the text center to design-px x (horizontal scroll). */
  setX(x: number): void;
  /** 0..1 scroll progress — drives the travelling light streak and the
   *  refraction flow phase. */
  setProgress(p: number): void;
  /** 0..1 cross-fade between `bgStops` and `bgStopsB`. */
  setBgMix(m: number): void;
  /** 0..1 overall glass opacity (release fades). */
  setOpacity(o: number): void;
  /** Animate a background layer (alpha/offset/scale) — image swaps. */
  setLayer(i: number, s: GlassLayerState): void;
  render(): void;
  destroy(): void;
}

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  /* vUv is TOP-DOWN (0,0 = top-left) so all textures upload unflipped */
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

/** Fragment source; TAPS = background samples along the dispersion axis
 *  (8 on Blink, 6 on WebKit). */
const frag = (taps: number) => `
precision highp float;
varying vec2 vUv;
uniform sampler2D uBg;    /* live stage-space background composition */
uniform sampler2D uSdf;   /* R = crisp sd, A = lowpassed sd (text-local) */
uniform vec2 uStage;      /* stage size, design px */
uniform vec4 uRect;       /* sdf rect in design px (x animates) */
uniform vec2 uTexel;      /* one sdf texel in text-local uv */
uniform float uSpan1;     /* crisp sd span: sd = (r - 0.5) * uSpan1 (px) */
uniform float uSpan2;     /* lowpassed sd span (px) */
uniform float uAA;        /* coverage AA half-width, design px */
uniform float uShift;     /* slab offset, design px (downward) */
uniform float uMag;       /* backdrop magnification at full thickness */
uniform float uThick;     /* sd depth of full glass thickness, design px */
uniform float uRefr;      /* lens displacement scale (px per unit slope) */
uniform float uFrost;     /* roughness blur at full thickness, design px */
uniform float uLift;      /* milky lift, color units */
uniform float uEdge;      /* hairline cut-edge width, design px */
uniform float uSpec;      /* specular sheen strength */
uniform float uFres;      /* fresnel edge lift */
uniform float uStreak;    /* travelling light streak strength */
uniform float uFlow;      /* refraction flow travel, design px */
uniform float uProgress;  /* 0..1 scroll progress */
uniform float uOpacity;
uniform vec3 uTap[${taps}]; /* xy = blur-ring jitter, z = dispersion scale */
uniform vec3 uW[${taps}];   /* per-tap RGB weights (pre-normalized) */
uniform float uCrack;     /* facet shear displacement, design px (0 = off) */
uniform float uCrackCell; /* voronoi facet cell size, design px */
uniform float uGlint;     /* fracture-line highlight strength */

float sd1(vec2 t) { return (texture2D(uSdf, t).r - 0.5) * uSpan1; }
float sd2(vec2 t) { return (texture2D(uSdf, t).a - 0.5) * uSpan2; }

/* cracked-crystal facets (round 20): jittered voronoi over TEXT-LOCAL
   design px — F1's cell id gives each facet a stable random shear
   direction (the backdrop breaks into angular shards instead of one
   liquid lens), F2-F1 gives the fracture borders a bright glint line. */
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

/* shaped glass thickness 0..1 — parabolic lens cap over the lowpassed
   field: flat on the stroke's spine, smooth shoulders at the sides */
float hgt(vec2 t) {
  float th = clamp(sd2(t) / uThick, 0.0, 1.0);
  return th * (2.0 - th);
}

void main() {
  vec2 px = vUv * uStage;
  vec2 t = (px - uRect.xy) / uRect.zw;
  if (t.x < 0.0 || t.x > 1.0 || t.y < 0.0 || t.y > 1.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  /* razor-sharp coverage straight from the crisp SDF channel */
  float d = sd1(t);
  float cov = smoothstep(-uAA, uAA, d);
  if (cov < 0.004) {
    gl_FragColor = vec4(0.0);
    return;
  }

  /* ---- low-frequency glass surface (lowpassed SDF only) ----
     The sample phase drifts sideways with scroll progress so the
     refraction "flows" while the text travels. */
  vec2 tf = t + vec2(uFlow * (uProgress - 0.5), 0.0) / uRect.zw;
  float th = clamp(sd2(tf) / uThick, 0.0, 1.0);
  float h = th * (2.0 - th);
  /* wide one-sided differences: broad enough to iron 8-bit quantization,
     2 fetches instead of 4 (the lowpassed field is smooth, the half-step
     bias is invisible) */
  vec2 e = uTexel * 8.0;
  vec2 gh = vec2(
    hgt(tf + vec2(e.x, 0.0)) - h,
    hgt(tf + vec2(0.0, e.y)) - h
  ) / (e * uRect.zw); /* slope per design px; points toward thicker glass */

  /* ---- transmission displacement (design px -> uv) ----
     lens term: -grad(height) — broad and liquid, zero on the flat spine,
     strongest over the shoulders; plus a magnification slab about the
     glyph-row center and a small constant slab shift.

     Round 8 ("interiors smeary/greasy"): the magnification used to scale
     with distance from the ROW center (uncapped) and swing ×0.35..×1 with
     the local thickness — far letters got a 40+ px lateral shift whose
     magnitude wobbled across every stroke, dragging the refracted backdrop
     into blotchy double-image smears. Cap the slab displacement at a lens
     radius (18 design px) and keep it nearly constant inside the stroke
     (×0.85..×1): each letter now shifts its backdrop as one clean slab and
     the liquid look comes from the edge-localised lens term alone. */
  vec2 center = (uRect.xy + 0.5 * uRect.zw) / uStage;
  vec2 mv = (center - vUv) * (1.0 - 1.0 / uMag) * uStage; /* design px */
  float mlen = length(mv);
  mv *= min(mlen, 18.0) / max(mlen, 1e-4);
  vec2 disp = (mv * mix(0.85, 1.0, h)
            + vec2(0.0, uShift) - gh * uRefr) / uStage;

  /* ---- cracked-crystal facet shear + fracture glint ---- */
  float glint = 0.0;
  if (uCrack > 0.001) {
    vec2 lp = t * uRect.zw / uCrackCell; /* facet-cell space */
    vec2 cell = floor(lp);
    vec2 fr = lp - cell;
    float f1 = 8.0; float f2 = 8.0;
    vec2 id1 = vec2(0.0);
    for (int cy = -1; cy <= 1; cy++) {
      for (int cx = -1; cx <= 1; cx++) {
        vec2 o = vec2(float(cx), float(cy));
        vec2 seed = o + 0.5 + (hash2(cell + o) - 0.5) * 0.9;
        float dd = length(seed - fr);
        if (dd < f1) { f2 = f1; f1 = dd; id1 = cell + o; }
        else if (dd < f2) { f2 = dd; }
      }
    }
    /* per-facet stable shear direction; weighted by thickness so the
       shards live in the glass body and die out at the silhouette */
    vec2 dir = normalize(hash2(id1 + 7.31) - 0.5);
    disp += dir * (uCrack * (0.35 + 0.65 * h)) / uStage;
    /* bright hairline where two facets meet */
    glint = (1.0 - smoothstep(0.0, 0.14, f2 - f1)) * (0.25 + 0.75 * h);
  }

  /* ---- dispersion + roughness sampling (MeshTransmissionMaterial-ish):
     TAPS samples along the chromatic axis (per-channel displacement scale
     1±uCa baked into uTap[i].z) jittered on a ring that widens with
     thickness. Weights/jitter are precomputed uniforms — zero
     transcendentals per pixel. */
  vec2 brv = vec2(uFrost * (0.25 + 0.75 * h)) / uStage;
  vec3 acc = vec3(0.0);
  for (int i = 0; i < ${taps}; i++) {
    acc += texture2D(uBg, vUv + disp * uTap[i].z + uTap[i].xy * brv).rgb
      * uW[i];
  }
  vec3 col = acc;

  /* light-glass floor: the glass must NEVER come out darker than the
     scene directly behind it — refraction may only brighten. With the
     crystal facets on, the floor is softened (72%) so the dark half of a
     facet shear survives — a fully-clamped shard is invisible over a
     product render darker than the veil. */
  vec3 base = texture2D(uBg, vUv).rgb;
  col = max(col, base * (uCrack > 0.001 ? 0.72 : 1.0));

  /* faint milky body — kept subtle so the refraction reads clear */
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(lum), 0.06);
  col += vec3(uLift * 0.95, uLift, uLift * 1.08);

  /* fresnel: slight brightening toward the silhouette */
  float edgeGlow = 1.0 - h;
  col += vec3(0.9, 0.96, 1.08) * (uFres * edgeGlow * edgeGlow);

  /* broad specular sheen: shoulders of the bulge facing the key light
     (upper-left), following the lowpassed surface curvature. Gated by
     slope MAGNITUDE with a noise floor so flat stroke interiors (where
     8-bit quantization fakes tiny slopes) never catch splotches — light
     only lives on real, broad curvature. */
  float glen = length(gh);
  vec2 nd = gh / max(glen, 1e-4);
  float facing = clamp(dot(-nd, vec2(-0.355, -0.935)), 0.0, 1.0);
  /* round 8: tighter slope gate + cubic facing falloff — the old broad
     quadratic sheen pooled into irregular pale crescents mid-stroke that
     read as grease. The highlight now stays a crisp accent on strongly
     light-facing shoulders and dies out before the stroke interior. */
  float slope = smoothstep(0.28, 0.75, glen * uThick * 0.75);
  col += vec3(0.95, 0.97, 1.0) * (uSpec * slope * facing * facing * facing);

  /* fracture-line glint (facet borders catch the light) */
  col += vec3(0.9, 0.95, 1.06) * (uGlint * glint);

  /* hairline cut edge from the CRISP field + extra light on top edges */
  float line = (1.0 - smoothstep(0.0, uEdge, d)) * cov;
  float up = clamp(nd.y, 0.0, 1.0); /* sd grows inward: +y = top edge */
  col += vec3(0.095, 0.10, 0.112) * line;
  col += vec3(0.055) * line * up;

  /* VFX: broad diagonal light streak sweeping with scroll progress.
     Round 8: windowed by a rest envelope — exactly ZERO on the progress
     plateaus (p = 0 entrance rest, p = 1 release rest) so a parked page
     never shows a frozen pale band on the glass; the streak only lives
     while the text is actually travelling. */
  if (uStreak > 0.001) {
    float sw = smoothstep(0.0, 0.12, uProgress)
             * (1.0 - smoothstep(0.88, 1.0, uProgress));
    vec2 lp = t * uRect.zw;
    float sn = (lp.x - 0.6 * (lp.y - 0.5 * uRect.w)) / uRect.z;
    float sPos = mix(-0.3, 1.3, uProgress);
    float sd = (sn - sPos) / 0.2;
    float streak = exp(-sd * sd) * sw;
    col += vec3(0.92, 0.96, 1.06) * (uStreak * streak * (0.35 + 0.65 * h));
  }

  float a = cov * uOpacity;
  gl_FragColor = vec4(col * a, a); /* premultiplied */
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    // eslint-disable-next-line no-console
    console.warn("glasstext shader:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function canvas2d(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

function imageReady(img: HTMLImageElement) {
  if (img.complete && img.naturalWidth > 0) return Promise.resolve();
  return new Promise<void>((res) => {
    img.addEventListener("load", () => res(), { once: true });
    img.addEventListener("error", () => res(), { once: true });
  });
}

type LayerSource = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;

function isVideo(src: LayerSource): src is HTMLVideoElement {
  return typeof HTMLVideoElement !== "undefined" &&
    src instanceof HTMLVideoElement;
}

/** Can this source be drawImage()d right now? Videos need a decoded frame
 *  (readyState ≥ HAVE_CURRENT_DATA); images need natural dimensions;
 *  canvases are always drawable (transparent until first painted). */
function drawable(src: LayerSource) {
  if (isVideo(src)) return src.readyState >= 2 && src.videoWidth > 0;
  if (src instanceof HTMLCanvasElement) return src.width > 0;
  return src.complete && src.naturalWidth > 0;
}

function ownMaskImage(src: string | HTMLImageElement | undefined) {
  if (!src) return null;
  if (typeof src !== "string") return src;
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  return img;
}

/* ---------- exact euclidean distance transform (Felzenszwalb) ---------- */

function edt1d(
  f: Float32Array,
  n: number,
  out: Float32Array,
  v: Int32Array,
  z: Float32Array,
) {
  let k = 0;
  v[0] = 0;
  z[0] = -1e20;
  z[1] = 1e20;
  for (let q = 1; q < n; q++) {
    let s =
      (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = 1e20;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    out[q] = dq * dq + f[v[k]];
  }
}

/** Squared distance to the nearest "seed" pixel (seed = f 0, else INF). */
function edt2d(f: Float32Array, w: number, h: number) {
  const n = Math.max(w, h);
  const row = new Float32Array(n);
  const out1 = new Float32Array(n);
  const v = new Int32Array(n);
  const z = new Float32Array(n + 1);
  // columns
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) row[y] = f[y * w + x];
    edt1d(row, h, out1, v, z);
    for (let y = 0; y < h; y++) f[y * w + x] = out1[y];
  }
  // rows
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) row[x] = f[y * w + x];
    edt1d(row, w, out1, v, z);
    for (let x = 0; x < w; x++) f[y * w + x] = out1[x];
  }
  return f;
}

/** Signed distance (px, inside-positive) from an alpha-mask canvas.
 *  ONE light 3×3 binomial pass only — just enough to iron the binary
 *  grid's half-pixel stairstepping without softening the letterforms
 *  (coverage AA in the shader does the visual smoothing). */
function maskToSdf(mask: HTMLCanvasElement) {
  const w = mask.width;
  const h = mask.height;
  const data = mask.getContext("2d")!.getImageData(0, 0, w, h).data;
  const INF = 1e20;
  const fIn = new Float32Array(w * h);
  const fOut = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const inside = data[i * 4 + 3] >= 128;
    fIn[i] = inside ? INF : 0; // distance to nearest outside px
    fOut[i] = inside ? 0 : INF; // distance to nearest inside px
  }
  edt2d(fIn, w, h);
  edt2d(fOut, w, h);
  const sd = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    sd[i] =
      fIn[i] > 0 ? Math.sqrt(fIn[i]) - 0.5 : -(Math.sqrt(fOut[i]) - 0.5);
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - 1);
      const x1 = Math.min(w - 1, x + 1);
      const y0 = Math.max(0, y - 1);
      const y1 = Math.min(h - 1, y + 1);
      out[y * w + x] =
        (sd[y0 * w + x0] + 2 * sd[y0 * w + x] + sd[y0 * w + x1] +
          2 * sd[y * w + x0] + 4 * sd[y * w + x] + 2 * sd[y * w + x1] +
          sd[y1 * w + x0] + 2 * sd[y1 * w + x] + sd[y1 * w + x1]) / 16;
    }
  }
  return out;
}

/** Wide separable box blur (3 passes ≈ gaussian) with edge replication —
 *  turns the crisp SDF into the low-frequency "glass surface" field. */
function blurField(sd: Float32Array, w: number, h: number, r: number) {
  if (r <= 0) return Float32Array.from(sd);
  const a = Float32Array.from(sd);
  const b = new Float32Array(w * h);
  const inv = 1 / (2 * r + 1);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let acc = 0;
      for (let i = -r; i <= r; i++)
        acc += a[row + Math.min(w - 1, Math.max(0, i))];
      for (let x = 0; x < w; x++) {
        b[row + x] = acc * inv;
        acc +=
          a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let i = -r; i <= r; i++)
        acc += b[Math.min(h - 1, Math.max(0, i)) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = acc * inv;
        acc +=
          b[Math.min(h - 1, y + r + 1) * w + x] -
          b[Math.max(0, y - r) * w + x];
      }
    }
  }
  return a;
}

export function createGlassText(cfg: GlassTextConfig): GlassText | null {
  // WebKit rasterizes the glass framebuffer noticeably slower than Blink;
  // run at half stage resolution there (html.safari set in main.ts) — the
  // roughness blur hides the difference. Blink runs at FULL stage
  // resolution: the type must read as vector-crisp glass at 100%.
  const isSafari = document.documentElement.classList.contains("safari");
  let res = cfg.resolution ?? (isSafari ? 0.5 : 1);
  if (import.meta.env.DEV) {
    // QA override: ?glassres=0.5 pins the framebuffer scale for A/B fps runs
    const q = new URLSearchParams(location.search).get("glassres");
    if (q) res = Math.min(1, Math.max(0.2, Number(q) || res));
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(cfg.stageW * res);
  canvas.height = Math.round(cfg.stageH * res);
  canvas.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
  canvas.className = "glasstext-canvas";

  const gl =
    (canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
    }) as WebGLRenderingContext | null) ??
    (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag(isSafari ? 6 : 7));
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;

  cfg.host.appendChild(canvas);

  gl.useProgram(prog);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  gl.disable(gl.BLEND);

  const U = (name: string) => gl.getUniformLocation(prog, name);
  const uRect = U("uRect");
  const uOpacity = U("uOpacity");
  const uProgress = U("uProgress");

  // QA override (dev): ?gt_<param>=<num> pins any glass look param for A/B
  // isolation runs (e.g. ?gt_spec=0&gt_streak=0). No-op in production.
  const P = (key: string, v: number) => {
    if (!import.meta.env.DEV) return v;
    const q = new URLSearchParams(location.search).get(`gt_${key}`);
    return q === null || q === "" || Number.isNaN(Number(q)) ? v : Number(q);
  };
  const thick = P("thick", cfg.thick ?? cfg.fontSize * 0.06);
  gl.uniform1i(U("uBg"), 0);
  gl.uniform1i(U("uSdf"), 1);
  gl.uniform2f(U("uStage"), cfg.stageW, cfg.stageH);
  gl.uniform1f(U("uAA"), 0.75 / res);
  gl.uniform1f(U("uShift"), P("shift", cfg.shift ?? 5));
  gl.uniform1f(U("uMag"), P("mag", cfg.magnify ?? 1.045));
  gl.uniform1f(U("uThick"), thick);
  // peak lens displacement `refract` px happens at max slope 2/thick
  gl.uniform1f(U("uRefr"), (P("refract", cfg.refract ?? 16) * thick) / 2);
  gl.uniform1f(U("uFrost"), P("frost", cfg.frost ?? 7));
  gl.uniform1f(U("uLift"), P("lift", cfg.lift ?? 0.03));
  gl.uniform1f(U("uEdge"), P("edge", cfg.edge ?? 2));
  gl.uniform1f(U("uSpec"), P("spec", cfg.spec ?? 0.3));
  gl.uniform1f(U("uFres"), P("fres", cfg.fresnel ?? 0.05));
  gl.uniform1f(U("uStreak"), P("streak", cfg.streak ?? 0.14));
  gl.uniform1f(U("uFlow"), P("flow", cfg.flow ?? 30));
  const crack = P("crack", cfg.crack ?? 0);
  gl.uniform1f(U("uCrack"), crack);
  gl.uniform1f(
    U("uCrackCell"),
    P("crackcell", cfg.crackCell ?? cfg.fontSize * 0.5),
  );
  gl.uniform1f(U("uGlint"), P("glint", cfg.glint ?? (crack > 0 ? 0.16 : 0)));

  // precomputed dispersion/roughness taps: positions on a widening ring,
  // per-channel gaussian weights along the chromatic axis (normalized so
  // the shader is a plain weighted sum — no per-pixel transcendentals)
  {
    const n = isSafari ? 6 : 7;
    const ca = cfg.ca ?? 0.015;
    const w: Array<[number, number, number]> = [];
    const sum = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1);
      const wi: [number, number, number] = [
        Math.exp(-((f - 0.1) ** 2) * 9),
        Math.exp(-((f - 0.5) ** 2) * 9),
        Math.exp(-((f - 0.9) ** 2) * 9),
      ];
      w.push(wi);
      for (let c = 0; c < 3; c++) sum[c] += wi[c];
    }
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1);
      const ang = f * 10.166 + 1.7;
      const r = Math.sqrt(f * 0.9 + 0.1);
      gl.uniform3f(
        U(`uTap[${i}]`),
        Math.cos(ang) * r,
        Math.sin(ang) * r,
        1 + ca * (f * 2 - 1),
      );
      gl.uniform3f(
        U(`uW[${i}]`),
        w[i][0] / sum[0],
        w[i][1] / sum[1],
        w[i][2] / sum[2],
      );
    }
  }

  // ---- state ----
  let x = cfg.x;
  let opacity = 1;
  let progress = 0;
  let bgMix = 0;
  let ready = false;
  let active = true;
  let destroyed = false;
  let dirty = true;
  let bgDirty = true;
  let rectW = 0;
  let rectH = 0;

  const layerState = cfg.layers.map(() => ({
    alpha: 1,
    dx: 0,
    dy: 0,
    scale: 1,
  }));

  // ---- live background composition (2D canvas → texture 0) ----
  // Decoupled from the framebuffer scale and NEVER below 1.0× design px:
  // the product renders refracted through the glass must stay crisp even
  // when the framebuffer itself is scaled down (WebKit).
  let bgRes = Math.max(res, 1);
  if (import.meta.env.DEV) {
    // QA override: ?glassbg=0.5 pins the composition scale for A/B fps runs
    const q = new URLSearchParams(location.search).get("glassbg");
    if (q) bgRes = Math.min(1, Math.max(0.2, Number(q) || bgRes));
  }
  const bg = canvas2d(cfg.stageW * bgRes, cfg.stageH * bgRes);
  const bgc = bg.getContext("2d")!;
  bgc.imageSmoothingQuality = "high"; // hi-res renders downscale cleanly
  const mkGrad = (stops: Array<[number, string]>) => {
    const g = bgc.createLinearGradient(0, 0, 0, bg.height);
    for (const [o, c] of stops) g.addColorStop(o, c);
    return g;
  };
  const grad = mkGrad(cfg.bgStops);
  const gradB = cfg.bgStopsB ? mkGrad(cfg.bgStopsB) : null;

  let bgTex: WebGLTexture | null = null;
  const composite = () => {
    bgc.globalAlpha = 1;
    bgc.fillStyle = grad;
    bgc.fillRect(0, 0, bg.width, bg.height);
    if (gradB && bgMix > 0.004) {
      // veil-state cross-fade (glasses → dock): overlay the second gradient
      // exactly like the DOM's dock-veil opacity so the refraction matches
      bgc.globalAlpha = Math.min(1, bgMix);
      bgc.fillStyle = gradB;
      bgc.fillRect(0, 0, bg.width, bg.height);
      bgc.globalAlpha = 1;
    }
    for (let i = 0; i < cfg.layers.length; i++) {
      const L = cfg.layers[i];
      const s = layerState[i];
      if (s.alpha <= 0.004) continue;
      if (!drawable(L.image)) continue;
      const [rx, ry, rw, rh] = L.rect;
      const w = rw * s.scale;
      const h = rh * s.scale;
      const lx = rx + s.dx + (rw - w) / 2;
      const ly = ry + s.dy + (rh - h) / 2;
      bgc.globalAlpha = Math.min(1, Math.max(0, s.alpha));
      bgc.drawImage(L.image, lx * bgRes, ly * bgRes, w * bgRes, h * bgRes);
    }
    bgc.globalAlpha = 1;
    gl.activeTexture(gl.TEXTURE0);
    if (!bgTex) {
      bgTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, bgTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bg);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, bgTex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, bg);
    }
    bgDirty = false;
  };

  const draw = () => {
    if (!ready || destroyed) return;
    if (bgDirty) composite();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform4f(uRect, x - rectW / 2, cfg.y - rectH / 2, rectW, rectH);
    gl.uniform1f(uOpacity, opacity);
    gl.uniform1f(uProgress, progress);
    // clear the whole buffer (the rect moves), then scissor the fullscreen
    // pass to the glyph rect — everything outside it is guaranteed
    // transparent, so the rasterizer skips ~40% of the stage per frame
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const sx = Math.max(0, Math.floor((x - rectW / 2) * res));
    const sw = Math.min(canvas.width, Math.ceil((x + rectW / 2) * res)) - sx;
    const sy = Math.max(
      0,
      canvas.height - Math.ceil((cfg.y + rectH / 2) * res),
    );
    const sh =
      Math.min(
        canvas.height,
        canvas.height - Math.floor((cfg.y - rectH / 2) * res),
      ) - sy;
    if (sw > 0 && sh > 0) {
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(sx, sy, sw, sh);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.SCISSOR_TEST);
    }
    dirty = false;
  };

  const render = () => {
    dirty = true;
    if (active) draw();
  };

  // ---- async texture build (font/image mask + device images) ----
  const fontSpec = `${cfg.fontWeight ?? "400"} ${cfg.fontSize}px ${cfg.fontFamily}`;
  const maskImage = ownMaskImage(cfg.maskImage);
  const fontLoaded = document.fonts
    ? document.fonts.load(fontSpec, cfg.text).then(
        () => undefined,
        () => undefined,
      )
    : Promise.resolve(undefined);

  // Video/canvas layers must NOT gate readiness: they are lazy-fed (and a
  // video never loads at all under prefers-reduced-motion), and composite()
  // skips non-drawable sources anyway. When a video's first frame does
  // arrive, refresh the background so the glass picks it up (canvas layers
  // are repainted by their owner, who calls invalidateBg()).
  for (const l of cfg.layers) {
    if (isVideo(l.image) && !drawable(l.image)) {
      l.image.addEventListener(
        "loadeddata",
        () => {
          if (destroyed) return;
          bgDirty = true;
          dirty = true;
          if (active) draw();
        },
        { once: true },
      );
    }
  }

  Promise.all([
    fontLoaded,
    maskImage ? imageReady(maskImage) : undefined,
    ...cfg.layers.map((l) =>
      l.image instanceof HTMLImageElement ? imageReady(l.image) : undefined,
    ),
  ]).then(() => {
    if (destroyed) return;

    // glyph mask, text-local space — full design res for crisp coverage
    const mres = Math.min(1, res * 2);
    // crisp channel span: only the AA band + hairline edge live here, so
    // 8-bit quantization stays at ~0.06 px per level
    const span1 = 16;
    // lowpass blur radius — broad enough that the surface reads liquid
    const blurR = Math.max(6, Math.round(cfg.fontSize * mres * 0.045));
    // lowpass channel span: just the thickness ramp + headroom — a tight
    // span keeps 8-bit quantization well under the gradient epsilon
    const span2 = Math.max(56, Math.round(cfg.fontSize * mres * 0.16));
    const probe = canvas2d(8, 8).getContext("2d")!;
    probe.font = `${cfg.fontWeight ?? "400"} ${cfg.fontSize * mres}px ${cfg.fontFamily}`;
    const met = probe.measureText(cfg.text);
    const asc = met.actualBoundingBoxAscent || cfg.fontSize * mres * 0.74;
    const desc = met.actualBoundingBoxDescent || cfg.fontSize * mres * 0.06;
    const pad = Math.ceil(blurR * 2 + 8 + cfg.fontSize * mres * 0.06);
    const maskDesignW = cfg.maskWidth ??
      (maskImage ? maskImage.naturalWidth : met.width / mres);
    const maskDesignH = cfg.maskHeight ??
      (maskImage ? maskImage.naturalHeight : (asc + desc) / mres);
    const mw = Math.ceil(maskDesignW * mres + pad * 2);
    const mh = Math.ceil(maskDesignH * mres + pad * 2);
    const mask = canvas2d(mw, mh);
    const mc = mask.getContext("2d")!;
    if (maskImage) {
      mc.drawImage(
        maskImage,
        pad,
        pad,
        maskDesignW * mres,
        maskDesignH * mres,
      );
    } else {
      mc.font = probe.font;
      mc.fillStyle = "#fff";
      mc.textBaseline = "alphabetic";
      mc.fillText(cfg.text, pad, mh / 2 + (asc - desc) / 2);
    }

    // two-channel field: R = crisp sd, A = wide lowpassed sd
    const sdf = maskToSdf(mask);
    const soft = blurField(sdf, mw, mh, blurR);
    const bytes = new Uint8Array(mw * mh * 2);
    for (let i = 0; i < sdf.length; i++) {
      const v1 = 0.5 + sdf[i] / span1;
      const v2 = 0.5 + soft[i] / span2;
      bytes[i * 2] = Math.max(0, Math.min(255, Math.round(v1 * 255)));
      bytes[i * 2 + 1] = Math.max(0, Math.min(255, Math.round(v2 * 255)));
    }

    rectW = mw / mres;
    rectH = mh / mres;

    gl.activeTexture(gl.TEXTURE1);
    const sdfTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, sdfTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE_ALPHA,
      mw,
      mh,
      0,
      gl.LUMINANCE_ALPHA,
      gl.UNSIGNED_BYTE,
      bytes,
    );

    gl.uniform2f(U("uTexel"), 1 / mw, 1 / mh);
    gl.uniform1f(U("uSpan1"), span1 / mres); // design px
    gl.uniform1f(U("uSpan2"), span2 / mres);

    ready = true;
    bgDirty = true;
    draw();
    cfg.onReady?.();
  });

  // ---- render only near the viewport ----
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        active = en.isIntersecting;
        if (active && dirty) draw();
      }
    },
    { rootMargin: "60% 0px 60% 0px" },
  );
  io.observe(cfg.host);

  return {
    canvas,
    invalidateBg() {
      bgDirty = true;
      dirty = true;
      if (active) draw();
    },
    setX(v: number) {
      if (v !== x) {
        x = v;
        dirty = true;
      }
    },
    setProgress(p: number) {
      const v = Math.min(1, Math.max(0, p));
      if (v !== progress) {
        progress = v;
        dirty = true;
      }
    },
    setBgMix(m: number) {
      const v = Math.min(1, Math.max(0, m));
      if (v !== bgMix) {
        bgMix = v;
        bgDirty = true;
        dirty = true;
      }
    },
    setOpacity(o: number) {
      if (o !== opacity) {
        opacity = o;
        dirty = true;
      }
    },
    setLayer(i: number, s: GlassLayerState) {
      const cur = layerState[i];
      if (!cur) return;
      const alpha = s.alpha ?? cur.alpha;
      const dx = s.dx ?? cur.dx;
      const dy = s.dy ?? cur.dy;
      const scale = s.scale ?? cur.scale;
      if (
        alpha !== cur.alpha ||
        dx !== cur.dx ||
        dy !== cur.dy ||
        scale !== cur.scale
      ) {
        cur.alpha = alpha;
        cur.dx = dx;
        cur.dy = dy;
        cur.scale = scale;
        bgDirty = true;
        dirty = true;
      }
    },
    render,
    destroy() {
      destroyed = true;
      io.disconnect();
      canvas.remove();
    },
  };
}
