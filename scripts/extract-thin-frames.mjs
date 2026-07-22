// Extracts the s15 "Thin Enough to Disappear" alpha frame sequences from the
// delivered ProRes-4444 masters (30 frames each, 1920×1080/30fps):
//   public/video/thin-static.mov → public/assets/thin-frames/static/ts-NN.webp
//   public/video/thin-anim.mov   → public/assets/thin-frames/anim/ta-NN.webp
// Pipeline: ffmpeg → RGBA PNG (temp dir) → sharp alpha WebP q85 (the local
// ffmpeg has no libwebp encoder). Usage: node scripts/extract-thin-frames.mjs
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, "public/assets/thin-frames");
const tmp = mkdtempSync(join(tmpdir(), "thin-frames-"));

for (const [mov, sub, prefix] of [
  ["thin-static.mov", "static", "ts"],
  ["thin-anim.mov", "anim", "ta"],
]) {
  const pngDir = join(tmp, sub);
  mkdirSync(pngDir, { recursive: true });
  execFileSync("ffmpeg", [
    "-v", "error",
    "-i", join(ROOT, "public/video", mov),
    "-pix_fmt", "rgba",
    "-start_number", "0",
    join(pngDir, `${prefix}-%02d.png`),
  ]);
  const outDir = join(OUT, sub);
  mkdirSync(outDir, { recursive: true });
  for (const f of readdirSync(pngDir).sort()) {
    if (!f.endsWith(".png")) continue;
    await sharp(join(pngDir, f))
      .webp({ quality: 85, alphaQuality: 90 })
      .toFile(join(outDir, f.replace(".png", ".webp")));
  }
  console.log(`${sub}: ${readdirSync(outDir).length} frames`);
}
rmSync(tmp, { recursive: true, force: true });
