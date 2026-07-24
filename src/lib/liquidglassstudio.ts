import STUDIO_FRAG from "../vendor/liquid-glass-studio/test.glsl?raw";

export interface StudioLayer {
  image: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;
  rect: [number, number, number, number];
}

export interface StudioLayerState {
  alpha?: number;
  dx?: number;
  dy?: number;
  scale?: number;
}

export interface LiquidGlassStudioConfig {
  host: HTMLElement;
  stageW: number;
  stageH: number;
  x: number;
  y: number;
  width: number;
  height: number;
  maskImage: string | HTMLImageElement;
  bgStops: Array<[number, string]>;
  bgStopsB?: Array<[number, string]>;
  layers: StudioLayer[];
  opacity?: number;
  layersOpacity?: number;
  onReady?: () => void;
}

export interface LiquidGlassStudioHandle {
  readonly canvas: HTMLCanvasElement;
  invalidateBg(): void;
  setX(x: number): void;
  setProgress(p: number): void;
  setBgMix(m: number): void;
  setOpacity(o: number): void;
  setLayer(i: number, s: StudioLayerState): void;
  render(): void;
  destroy(): void;
}

const VERT = `#version 300 es
in vec4 a_position;
out vec3 vVertexPosition;
out vec2 vTextureCoord;
void main() {
  vVertexPosition = a_position.xyz;
  vTextureCoord = (a_position.xy + 1.0) * 0.5;
  gl_Position = a_position;
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("liquid-glass-studio shader:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function canvas2d(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

function imageReady(img: HTMLImageElement) {
  if (img.complete && img.naturalWidth > 0) return Promise.resolve();
  return new Promise<void>((resolve) => {
    img.addEventListener("load", () => resolve(), { once: true });
    img.addEventListener("error", () => resolve(), { once: true });
  });
}

function ownImage(src: string | HTMLImageElement) {
  if (typeof src !== "string") return src;
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  return img;
}

type LayerSource = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;

function isVideo(src: LayerSource): src is HTMLVideoElement {
  return typeof HTMLVideoElement !== "undefined" &&
    src instanceof HTMLVideoElement;
}

function drawable(src: LayerSource) {
  if (isVideo(src)) return src.readyState >= 2 && src.videoWidth > 0;
  if (src instanceof HTMLCanvasElement) return src.width > 0;
  return src.complete && src.naturalWidth > 0;
}

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

function edt2d(f: Float32Array, w: number, h: number) {
  const n = Math.max(w, h);
  const row = new Float32Array(n);
  const out1 = new Float32Array(n);
  const v = new Int32Array(n);
  const z = new Float32Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) row[y] = f[y * w + x];
    edt1d(row, h, out1, v, z);
    for (let y = 0; y < h; y++) f[y * w + x] = out1[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) row[x] = f[y * w + x];
    edt1d(row, w, out1, v, z);
    for (let x = 0; x < w; x++) f[y * w + x] = out1[x];
  }
  return f;
}

function maskToSdf(mask: HTMLCanvasElement) {
  const w = mask.width;
  const h = mask.height;
  const data = mask.getContext("2d")!.getImageData(0, 0, w, h).data;
  const INF = 1e20;
  const fIn = new Float32Array(w * h);
  const fOut = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const inside = data[i * 4 + 3] >= 128;
    fIn[i] = inside ? INF : 0;
    fOut[i] = inside ? 0 : INF;
  }
  edt2d(fIn, w, h);
  edt2d(fOut, w, h);
  const sd = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    sd[i] =
      fIn[i] > 0 ? Math.sqrt(fIn[i]) - 0.5 : -(Math.sqrt(fOut[i]) - 0.5);
  }
  return sd;
}

function setTextureFromSource(
  gl: WebGL2RenderingContext,
  texture: WebGLTexture,
  source: TexImageSource,
) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
}

export function createLiquidGlassStudioText(
  cfg: LiquidGlassStudioConfig,
): LiquidGlassStudioHandle | null {
  const canvas = document.createElement("canvas");
  canvas.width = cfg.stageW;
  canvas.height = cfg.stageH;
  canvas.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
  canvas.className = "glasstext-canvas liquid-glass-studio-canvas";

  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
  });
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, STUDIO_FRAG);
  if (!vs || !fs) return null;

  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("liquid-glass-studio link:", gl.getProgramInfoLog(prog));
    return null;
  }

  cfg.host.appendChild(canvas);
  gl.useProgram(prog);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0]),
    gl.STATIC_DRAW,
  );
  const aPosition = gl.getAttribLocation(prog, "a_position");
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

  const U = (name: string) => gl.getUniformLocation(prog, name);
  gl.uniform1i(U("uTexture"), 0);
  gl.uniform1i(U("uCustomTexture"), 1);
  gl.uniform1i(U("uMaskTexture"), 2);
  gl.uniform1f(U("uAngle"), 0);
  gl.uniform1f(U("uMix"), 0.055);
  gl.uniform1i(U("uBlendMode"), 0);
  gl.uniform1f(U("uDispersion"), 0.18);
  gl.uniform1i(U("uShowBg"), 1);
  gl.uniform1i(U("uShape"), 0);
  gl.uniform1i(U("uInvert"), 1);
  gl.uniform1i(U("uMouseDistortDir"), 1);
  gl.uniform1f(U("uMouseDistort"), 0);
  gl.uniform3f(U("uColor"), 0.88, 0.92, 0.98);
  gl.uniform1i(U("uIsMask"), 1);
  gl.uniform1f(U("uTrackMouse"), 0);
  gl.uniform2f(U("uMousePos"), 0.5, 0.5);
  gl.uniform1f(U("uParentTrackMouse"), 0);
  gl.uniform2f(U("uResolution"), cfg.stageW, cfg.stageH);

  let x = cfg.x;
  let progress = 0;
  let opacity = cfg.opacity ?? 1;
  let bgMix = 0;
  let destroyed = false;
  let ready = false;
  let active = true;
  let dirty = true;
  let bgDirty = true;

  const layerState = cfg.layers.map(() => ({
    alpha: 1,
    dx: 0,
    dy: 0,
    scale: 1,
  }));

  const bg = canvas2d(cfg.stageW, cfg.stageH);
  const bgc = bg.getContext("2d")!;
  const maskStage = canvas2d(cfg.stageW, cfg.stageH);
  const maskStageCtx = maskStage.getContext("2d")!;
  const maskImage = ownImage(cfg.maskImage);
  const maskSdfCanvas = canvas2d(Math.max(1, Math.round(cfg.width)), Math.max(1, Math.round(cfg.height)));
  const maskSdfCtx = maskSdfCanvas.getContext("2d")!;

  const mkGrad = (stops: Array<[number, string]>) => {
    const g = bgc.createLinearGradient(0, 0, 0, cfg.stageH);
    for (const [o, c] of stops) g.addColorStop(o, c);
    return g;
  };
  const gradA = mkGrad(cfg.bgStops);
  const gradB = cfg.bgStopsB ? mkGrad(cfg.bgStopsB) : null;

  const bgTex = gl.createTexture()!;
  const customTex = gl.createTexture()!;
  const maskTex = gl.createTexture()!;

  const compositeBg = () => {
    bgc.clearRect(0, 0, cfg.stageW, cfg.stageH);
    bgc.globalAlpha = 1;
    bgc.fillStyle = gradA;
    bgc.fillRect(0, 0, cfg.stageW, cfg.stageH);
    if (gradB && bgMix > 0.004) {
      bgc.globalAlpha = Math.min(1, bgMix);
      bgc.fillStyle = gradB;
      bgc.fillRect(0, 0, cfg.stageW, cfg.stageH);
      bgc.globalAlpha = 1;
    }
    for (let i = 0; i < cfg.layers.length; i++) {
      const layer = cfg.layers[i];
      const state = layerState[i];
      if (state.alpha <= 0.004 || !drawable(layer.image)) continue;
      const [rx, ry, rw, rh] = layer.rect;
      const w = rw * state.scale;
      const h = rh * state.scale;
      const lx = rx + state.dx + (rw - w) / 2;
      const ly = ry + state.dy + (rh - h) / 2;
      bgc.globalAlpha = Math.min(1, Math.max(0, state.alpha));
      bgc.drawImage(layer.image, lx, ly, w, h);
    }
    bgc.globalAlpha = 1;
    setTextureFromSource(gl, bgTex, bg);
    bgDirty = false;
  };

  const syncMaskStage = () => {
    maskStageCtx.clearRect(0, 0, cfg.stageW, cfg.stageH);
    maskStageCtx.drawImage(
      maskImage,
      x - cfg.width / 2,
      cfg.y - cfg.height / 2,
      cfg.width,
      cfg.height,
    );
    setTextureFromSource(gl, maskTex, maskStage);
  };

  const draw = () => {
    if (!ready || destroyed) return;
    if (bgDirty) compositeBg();
    syncMaskStage();

    const scale = Math.max(0.02, cfg.height / cfg.stageH - 0.08);
    gl.uniform1f(U("uScale"), scale);
    gl.uniform1f(U("uOpacity"), opacity);
    gl.uniform1f(U("uRefraction"), 0.515 + progress * 0.015);
    gl.uniform2f(U("uPos"), x / cfg.stageW, 1 - cfg.y / cfg.stageH);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, bgTex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, customTex);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, maskTex);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    dirty = false;
  };

  const render = () => {
    dirty = true;
    if (active) draw();
  };

  for (const layer of cfg.layers) {
    if (isVideo(layer.image) && !drawable(layer.image)) {
      layer.image.addEventListener(
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
    imageReady(maskImage),
    ...cfg.layers.map((layer) =>
      layer.image instanceof HTMLImageElement ? imageReady(layer.image) : undefined,
    ),
  ]).then(() => {
    if (destroyed) return;

    maskSdfCtx.clearRect(0, 0, maskSdfCanvas.width, maskSdfCanvas.height);
    maskSdfCtx.drawImage(maskImage, 0, 0, maskSdfCanvas.width, maskSdfCanvas.height);
    const sdf = maskToSdf(maskSdfCanvas);
    const span = 24;
    const pixels = new Uint8Array(maskSdfCanvas.width * maskSdfCanvas.height * 4);
    for (let i = 0; i < sdf.length; i++) {
      const value = Math.max(
        0,
        Math.min(255, Math.round((0.5 + sdf[i] / span) * 255)),
      );
      pixels[i * 4] = value;
      pixels[i * 4 + 1] = value;
      pixels[i * 4 + 2] = value;
      pixels[i * 4 + 3] = value;
    }
    gl.bindTexture(gl.TEXTURE_2D, customTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      maskSdfCanvas.width,
      maskSdfCanvas.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels,
    );

    ready = true;
    bgDirty = true;
    draw();
    cfg.onReady?.();
  });

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        active = entry.isIntersecting;
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
    setProgress(v: number) {
      const next = Math.min(1, Math.max(0, v));
      if (next !== progress) {
        progress = next;
        dirty = true;
      }
    },
    setBgMix(v: number) {
      const next = Math.min(1, Math.max(0, v));
      if (next !== bgMix) {
        bgMix = next;
        bgDirty = true;
        dirty = true;
      }
    },
    setOpacity(v: number) {
      if (v !== opacity) {
        opacity = v;
        dirty = true;
      }
    },
    setLayer(i: number, s: StudioLayerState) {
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
      gl.deleteTexture(bgTex);
      gl.deleteTexture(customTex);
      gl.deleteTexture(maskTex);
      gl.deleteBuffer(quad);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
