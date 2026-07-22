// Amplified per-pixel diff of two same-size PNGs + stats.
// Usage: node scripts/pixdiff.mjs a.png b.png out.png [gain]
import sharp from "sharp";

const [a, b, out, gainArg] = process.argv.slice(2);
const gain = Number(gainArg || 8);
const A = await sharp(a).raw().toBuffer({ resolveWithObject: true });
const B = await sharp(b).raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = A.info;
const outBuf = Buffer.alloc(width * height * 3);
let maxd = 0,
  sum = 0,
  count = 0;
for (let i = 0; i < width * height; i++) {
  let d = 0;
  for (let c = 0; c < 3; c++) {
    const dv = Math.abs(A.data[i * channels + c] - B.data[i * channels + c]);
    d = Math.max(d, dv);
    outBuf[i * 3 + c] = Math.min(255, dv * gain);
  }
  if (d > maxd) maxd = d;
  if (d > 2) count++;
  sum += d;
}
await sharp(outBuf, { raw: { width, height, channels: 3 } })
  .png()
  .toFile(out);
console.log(
  `max ${maxd}  mean ${(sum / (width * height)).toFixed(3)}  px>2: ${count}`,
);
