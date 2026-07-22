// Crop a region and upscale it (nearest) for close inspection.
// Usage: node scripts/crop.mjs in.png x y w h [zoom] out.png
import sharp from "sharp";

const [inp, x, y, w, h, zoom, out] = process.argv.slice(2);
const z = Number(zoom || 4);
await sharp(inp)
  .extract({
    left: Number(x),
    top: Number(y),
    width: Number(w),
    height: Number(h),
  })
  .resize(Number(w) * z, Number(h) * z, { kernel: "nearest" })
  .toFile(out);
console.log("wrote", out);
