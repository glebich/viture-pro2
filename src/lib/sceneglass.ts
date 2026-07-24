import SCENEGLASS_VERT from "../shaders/sceneglass.vert.glsl?raw";
import SCENEGLASS_FRAG from "../shaders/sceneglass.frag.glsl?raw";

export interface SceneGlassLayer {
  image: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;
  rect: [number, number, number, number];
}

export interface SceneGlassLayerState {
  alpha?: number;
  dx?: number;
  dy?: number;
  scale?: number;
}

export interface SceneGlassBgState {
  progress: number;
  bgMix: number;
  phase: number;
}

export interface SceneGlassConfig {
  host: HTMLElement;
  stageW: number;
  stageH: number;
  x: number;
  y: number;
  width: number;
  height: number;
  maskImage: string | HTMLImageElement;
  bgImage?: string | HTMLImageElement;
  bgStops: Array<[number, string]>;
  bgStopsB?: Array<[number, string]>;
  drawBg?: (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    state: SceneGlassBgState,
  ) => void;
  layers: SceneGlassLayer[];
  onReady?: () => void;
}

export interface SceneGlassHandle {
  readonly canvas: HTMLCanvasElement;
  invalidateBg(): void;
  setX(x: number): void;
  setProgress(p: number): void;
  setBgMix(m: number): void;
  setBgPhase(p: number): void;
  setOpacity(o: number): void;
  setLayer(i: number, s: SceneGlassLayerState): void;
  render(): void;
  destroy(): void;
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn("sceneglass shader:", gl.getShaderInfoLog(sh));
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

export function createSceneGlass(cfg: SceneGlassConfig): SceneGlassHandle | null {
  const FIELD_SPAN = 26;
  const FIELD_PAD = Math.ceil(FIELD_SPAN + 6);
  const canvas = document.createElement("canvas");
  canvas.width = cfg.stageW;
  canvas.height = cfg.stageH;
  canvas.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
  canvas.className = "glasstext-canvas sceneglass-canvas";

  const gl =
    (canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
    }) as WebGLRenderingContext | null) ??
    (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
  if (!gl) return null;
  gl.getExtension("OES_standard_derivatives");

  const vs = compile(gl, gl.VERTEX_SHADER, SCENEGLASS_VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, SCENEGLASS_FRAG);
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
  gl.uniform1i(U("uScene"), 0);
  gl.uniform1i(U("uMask"), 1);
  gl.uniform1i(U("uField"), 2);
  gl.uniform2f(U("uTexel"), 1 / cfg.stageW, 1 / cfg.stageH);
  gl.uniform2f(U("uResolution"), cfg.stageW, cfg.stageH);
  gl.uniform1f(U("uFieldSpan"), FIELD_SPAN);

  let x = cfg.x;
  let opacity = 1;
  let progress = 0;
  let bgMix = 0;
  let bgPhase = 0;
  let ready = false;
  let active = true;
  let destroyed = false;
  let dirty = true;
  let sceneDirty = true;
  let maskDirty = true;

  const layerState = cfg.layers.map(() => ({
    alpha: 1,
    dx: 0,
    dy: 0,
    scale: 1,
  }));

  const scene = canvas2d(cfg.stageW, cfg.stageH);
  const scenec = scene.getContext("2d")!;
  const maskStage = canvas2d(cfg.stageW, cfg.stageH);
  const maskStageCtx = maskStage.getContext("2d")!;
  const fieldStage = canvas2d(cfg.stageW, cfg.stageH);
  const fieldStageCtx = fieldStage.getContext("2d")!;
  const maskImage = ownImage(cfg.maskImage);
  const bgImage = cfg.bgImage ? ownImage(cfg.bgImage) : null;
  const fieldLocal = canvas2d(
    cfg.width + FIELD_PAD * 2,
    cfg.height + FIELD_PAD * 2,
  );
  const fieldLocalCtx = fieldLocal.getContext("2d")!;

  const mkGrad = (stops: Array<[number, string]>) => {
    const g = scenec.createLinearGradient(0, 0, 0, scene.height);
    for (const [o, c] of stops) g.addColorStop(o, c);
    return g;
  };
  const gradA = mkGrad(cfg.bgStops);
  const gradB = cfg.bgStopsB ? mkGrad(cfg.bgStopsB) : null;

  const sceneTex = gl.createTexture();
  const maskTex = gl.createTexture();
  const fieldTex = gl.createTexture();
  if (!sceneTex || !maskTex || !fieldTex) return null;

  const setTexture = (tex: WebGLTexture, source: HTMLCanvasElement) => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  };

  const compositeScene = () => {
    scenec.clearRect(0, 0, scene.width, scene.height);
    scenec.globalAlpha = 1;
    if (cfg.drawBg) {
      cfg.drawBg(scenec, scene.width, scene.height, {
        progress,
        bgMix,
        phase: bgPhase,
      });
    } else if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
      scenec.drawImage(bgImage, 0, 0, scene.width, scene.height);
    } else {
      scenec.fillStyle = gradA;
      scenec.fillRect(0, 0, scene.width, scene.height);
      if (gradB && bgMix > 0.004) {
        scenec.globalAlpha = Math.min(1, bgMix);
        scenec.fillStyle = gradB;
        scenec.fillRect(0, 0, scene.width, scene.height);
        scenec.globalAlpha = 1;
      }
    }
    for (let i = 0; i < cfg.layers.length; i++) {
      const layer = cfg.layers[i];
      const s = layerState[i];
      if (s.alpha <= 0.004 || !drawable(layer.image)) continue;
      const [rx, ry, rw, rh] = layer.rect;
      const w = rw * s.scale;
      const h = rh * s.scale;
      const lx = rx + s.dx + (rw - w) / 2;
      const ly = ry + s.dy + (rh - h) / 2;
      scenec.globalAlpha = Math.min(1, Math.max(0, s.alpha));
      scenec.drawImage(layer.image, lx, ly, w, h);
    }
    scenec.globalAlpha = 1;
    gl.activeTexture(gl.TEXTURE0);
    setTexture(sceneTex, scene);
    sceneDirty = false;
  };

  const compositeMask = () => {
    const left = x - cfg.width / 2;
    const top = cfg.y - cfg.height / 2;

    maskStageCtx.clearRect(0, 0, maskStage.width, maskStage.height);
    maskStageCtx.drawImage(maskImage, left, top, cfg.width, cfg.height);

    fieldStageCtx.clearRect(0, 0, fieldStage.width, fieldStage.height);
    fieldStageCtx.drawImage(
      fieldLocal,
      left - FIELD_PAD,
      top - FIELD_PAD,
      cfg.width + FIELD_PAD * 2,
      cfg.height + FIELD_PAD * 2,
    );

    gl.activeTexture(gl.TEXTURE1);
    setTexture(maskTex, maskStage);
    gl.activeTexture(gl.TEXTURE2);
    setTexture(fieldTex, fieldStage);
    maskDirty = false;
  };

  const draw = () => {
    if (!ready || destroyed) return;
    if (sceneDirty) compositeScene();
    if (maskDirty) compositeMask();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(U("uOpacity"), opacity);
    gl.uniform1f(U("uProgress"), progress);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
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
          sceneDirty = true;
          dirty = true;
          if (active) draw();
        },
        { once: true },
      );
    }
  }

  Promise.all([
    imageReady(maskImage),
    bgImage ? imageReady(bgImage) : undefined,
    ...cfg.layers.map((l) =>
      l.image instanceof HTMLImageElement ? imageReady(l.image) : undefined,
    ),
  ]).then(() => {
    if (destroyed) return;
    fieldLocalCtx.clearRect(0, 0, fieldLocal.width, fieldLocal.height);
    fieldLocalCtx.drawImage(
      maskImage,
      FIELD_PAD,
      FIELD_PAD,
      cfg.width,
      cfg.height,
    );
    const sdf = maskToSdf(fieldLocal);
    const img = fieldLocalCtx.createImageData(fieldLocal.width, fieldLocal.height);
    for (let i = 0; i < sdf.length; i++) {
      const v = Math.max(
        0,
        Math.min(255, Math.round((0.5 + sdf[i] / FIELD_SPAN) * 255)),
      );
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    fieldLocalCtx.putImageData(img, 0, 0);
    ready = true;
    sceneDirty = true;
    maskDirty = true;
    draw();
    cfg.onReady?.();
  });

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
      sceneDirty = true;
      dirty = true;
      if (active) draw();
    },
    setX(v: number) {
      if (v !== x) {
        x = v;
        maskDirty = true;
        dirty = true;
      }
    },
    setProgress(v: number) {
      const next = Math.min(1, Math.max(0, v));
      if (next !== progress) {
        progress = next;
        if (cfg.drawBg) sceneDirty = true;
        dirty = true;
      }
    },
    setBgMix(v: number) {
      const next = Math.min(1, Math.max(0, v));
      if (next !== bgMix) {
        bgMix = next;
        sceneDirty = true;
        dirty = true;
      }
    },
    setBgPhase(v: number) {
      const next = Math.min(1, Math.max(0, v));
      if (next !== bgPhase) {
        bgPhase = next;
        sceneDirty = true;
        dirty = true;
      }
    },
    setOpacity(v: number) {
      if (v !== opacity) {
        opacity = v;
        dirty = true;
      }
    },
    setLayer(i: number, s: SceneGlassLayerState) {
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
        sceneDirty = true;
        dirty = true;
      }
    },
    render,
    destroy() {
      destroyed = true;
      io.disconnect();
      canvas.remove();
      gl.deleteTexture(sceneTex);
      gl.deleteTexture(maskTex);
      gl.deleteTexture(fieldTex);
      gl.deleteBuffer(quad);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
