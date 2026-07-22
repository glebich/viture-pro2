import sharp from "sharp";
import { readdirSync, statSync, mkdirSync, copyFileSync, writeFileSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("../harvest/assets", import.meta.url));
const OUT = fileURLToPath(new URL("../public/assets", import.meta.url));
const MAX_W = 2560;
const QUALITY = 82;

const report = [];

for (const dir of readdirSync(SRC)) {
  const srcDir = join(SRC, dir);
  if (!statSync(srcDir).isDirectory()) continue;
  const outDir = join(OUT, dir);
  mkdirSync(outDir, { recursive: true });

  for (const f of readdirSync(srcDir)) {
    const src = join(srcDir, f);
    const ext = extname(f).toLowerCase();
    const name = basename(f, ext);
    try {
      if (ext === ".svg" || f === "manifest.json") {
        copyFileSync(src, join(outDir, f));
        continue;
      }
      if (![".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) {
        copyFileSync(src, join(outDir, f));
        continue;
      }
      const img = sharp(src, { animated: ext === ".gif" });
      const meta = await img.metadata();
      const width = Math.min(meta.width ?? MAX_W, MAX_W);
      const out = join(outDir, `${name}.webp`);
      await img.resize({ width, withoutEnlargement: true }).webp({ quality: QUALITY, effort: 4 }).toFile(out);
      const before = statSync(src).size;
      const after = statSync(out).size;
      report.push(`${dir}/${f}: ${(before / 1e6).toFixed(1)}MB -> ${(after / 1e6).toFixed(2)}MB`);
    } catch (e) {
      report.push(`ERROR ${dir}/${f}: ${e.message}`);
      try { copyFileSync(src, join(outDir, f)); } catch {}
    }
  }
}

writeFileSync(join(OUT, "_compress-report.txt"), report.join("\n"));
console.log(`done: ${report.length} images processed`);
const errors = report.filter((r) => r.startsWith("ERROR"));
console.log(`errors: ${errors.length}`);
errors.slice(0, 10).forEach((e) => console.log(e));
