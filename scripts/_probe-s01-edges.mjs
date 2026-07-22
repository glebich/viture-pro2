// Measure outline-vs-photo registration: in the pre-melt shot find the white
// line y; in the settled (photo-only) shot find the frame edge y (max
// luminance gradient), along given columns. Usage:
//   node scripts/_probe-s01-edges.mjs <premPng> <settledPng> bottom x1 x2 ... --range y0 y1
import sharp from "sharp";

const args = process.argv.slice(2);
const [premPath, settledPath, label] = args;
const ri = args.indexOf("--range");
const [y0, y1] = [Number(args[ri + 1]), Number(args[ri + 2])];
const cols = args.slice(3, ri).map(Number);

const load = async (p) => {
  const { data, info } = await sharp(p)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width };
};
const prem = await load(premPath);
const settled = await load(settledPath);
const px = (img, x, y) => img.data[y * img.w + x];

for (const x of cols) {
  // white line: brightest pixel in range (line is near-white on dark frame)
  let lineY = -1,
    best = 0;
  for (let y = y0; y <= y1; y++) {
    const v = px(prem, x, y);
    if (v > best) {
      best = v;
      lineY = y;
    }
  }
  // frame edge: strongest gradient over a 3px baseline in the photo-only shot
  let edgeY = -1,
    bestG = 0;
  for (let y = y0 + 2; y <= y1 - 2; y++) {
    const g = Math.abs(px(settled, x, y + 2) - px(settled, x, y - 2));
    if (g > bestG) {
      bestG = g;
      edgeY = y;
    }
  }
  console.log(
    `${label} x=${x}: line y=${lineY} (lum ${best}), frame edge y=${edgeY} (grad ${bestG}), delta=${lineY - edgeY}`
  );
}
