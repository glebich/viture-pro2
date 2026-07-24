export interface LiquidGlassHandle {
  setX(x: number): void;
  setOpacity(o: number): void;
  destroy(): void;
}

export interface LiquidGlassConfig {
  host: HTMLElement;
  x: number;
  y: number;
  width: number;
  height: number;
  maskUrl: string;
}

const smoothStep = (a: number, b: number, t: number) => {
  const v = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return v * v * (3 - 2 * v);
};

const uid = () => `liquid-glass-${Math.random().toString(36).slice(2, 11)}`;

function makeDisplacementDataUrl(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const img = ctx.createImageData(canvas.width, canvas.height);
  const data = img.data;
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  const maxDx = 10.0;
  const maxDy = 8.0;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const nx = (x - cx) / Math.max(1, canvas.width * 0.5);
      const ny = (y - cy) / Math.max(1, canvas.height * 0.5);
      const r = Math.sqrt(nx * nx + ny * ny);
      const bulge = smoothStep(1.0, 0.0, r);
      const dx = -nx * bulge * maxDx;
      const dy = -ny * bulge * maxDy;
      data[i] = Math.round((dx / (maxDx * 2.0) + 0.5) * 255);
      data[i + 1] = Math.round((dy / (maxDy * 2.0) + 0.5) * 255);
      data[i + 2] = 0;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

export function createLiquidGlass(cfg: LiquidGlassConfig): LiquidGlassHandle {
  const id = uid();
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "fixed";
  svg.style.pointerEvents = "none";
  svg.style.zIndex = "0";

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
  filter.setAttribute("id", `${id}-filter`);
  filter.setAttribute("filterUnits", "userSpaceOnUse");
  filter.setAttribute("x", "0");
  filter.setAttribute("y", "0");
  filter.setAttribute("width", String(Math.round(cfg.width)));
  filter.setAttribute("height", String(Math.round(cfg.height)));

  const feImage = document.createElementNS("http://www.w3.org/2000/svg", "feImage");
  feImage.setAttribute("width", String(Math.round(cfg.width)));
  feImage.setAttribute("height", String(Math.round(cfg.height)));
  feImage.setAttributeNS(
    "http://www.w3.org/1999/xlink",
    "href",
    makeDisplacementDataUrl(cfg.width, cfg.height),
  );

  const feDisplacementMap = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "feDisplacementMap",
  );
  feDisplacementMap.setAttribute("in", "SourceGraphic");
  feDisplacementMap.setAttribute("in2", `${id}-map`);
  feDisplacementMap.setAttribute("xChannelSelector", "R");
  feDisplacementMap.setAttribute("yChannelSelector", "G");
  feDisplacementMap.setAttribute("scale", "8");
  feImage.setAttribute("id", `${id}-map`);

  filter.appendChild(feImage);
  filter.appendChild(feDisplacementMap);
  defs.appendChild(filter);
  svg.appendChild(defs);
  document.body.appendChild(svg);

  const el = document.createElement("div");
  el.className = "liquid-glass-dom";
  el.style.position = "absolute";
  el.style.left = `${cfg.x}px`;
  el.style.top = `${cfg.y}px`;
  el.style.width = `${cfg.width}px`;
  el.style.height = `${cfg.height}px`;
  el.style.transform = "translate(-50%, -50%)";
  el.style.zIndex = "2";
  el.style.pointerEvents = "none";
  el.style.opacity = "1";
  el.style.background =
    "linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06) 48%, rgba(255,255,255,0.12))";
  el.style.boxShadow =
    "0 0 0 1.2px rgba(255,255,255,0.48) inset, 0 0 52px rgba(255,255,255,0.24) inset, 0 0 18px rgba(255,255,255,0.12), 0 10px 24px rgba(0,0,0,0.08)";
  el.style.backdropFilter = `url(#${id}-filter) blur(1.4px) saturate(1.22) brightness(1.16) contrast(1.1)`;
  el.style.setProperty(
    "-webkit-backdrop-filter",
    `url(#${id}-filter) blur(1.4px) saturate(1.22) brightness(1.16) contrast(1.1)`,
  );
  (el.style as CSSStyleDeclaration).webkitMaskImage = `url("${cfg.maskUrl}")`;
  (el.style as CSSStyleDeclaration).webkitMaskRepeat = "no-repeat";
  (el.style as CSSStyleDeclaration).webkitMaskPosition = "center";
  (el.style as CSSStyleDeclaration).webkitMaskSize = "100% 100%";
  el.style.maskImage = `url("${cfg.maskUrl}")`;
  el.style.maskRepeat = "no-repeat";
  el.style.maskPosition = "center";
  el.style.maskSize = "100% 100%";

  cfg.host.appendChild(el);

  return {
    setX(x: number) {
      el.style.left = `${x}px`;
    },
    setOpacity(o: number) {
      el.style.opacity = `${Math.max(0, Math.min(1, o))}`;
    },
    destroy() {
      el.remove();
      svg.remove();
    },
  };
}
