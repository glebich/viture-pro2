/* Re-encode public/assets webp files IN PLACE for lighter delivery:
 * max width 1920 (nothing displays larger than the 1920 stage),
 * quality 76, effort 5, alpha preserved. Files already <150KB are skipped.
 * NOTE: this reads/writes public/assets only — it never touches harvest/. */
import sharp from "sharp";
import { readdirSync, statSync, renameSync, unlinkSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../public/assets", import.meta.url));
const MAX_W = 1920;
const QUALITY = 76;
const EFFORT = 5;
const SKIP_BELOW = 150 * 1024; // bytes

const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (extname(f).toLowerCase() === ".webp") files.push(p);
  }
})(ROOT);

let beforeTotal = 0;
let afterTotal = 0;
let reencoded = 0;
let skipped = 0;
let errors = 0;

for (const file of files) {
  const before = statSync(file).size;
  beforeTotal += before;
  if (before < SKIP_BELOW) {
    afterTotal += before;
    skipped++;
    continue;
  }
  const tmp = `${file}.tmp.webp`;
  try {
    await sharp(file)
      .resize({ width: MAX_W, withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: EFFORT }) // alpha kept by default
      .toFile(tmp);
    const after = statSync(tmp).size;
    if (after < before) {
      renameSync(tmp, file);
      afterTotal += after;
      reencoded++;
    } else {
      unlinkSync(tmp);
      afterTotal += before;
      skipped++;
    }
  } catch (e) {
    errors++;
    afterTotal += before;
    try { unlinkSync(tmp); } catch {}
    console.error(`ERROR ${file}: ${e.message}`);
  }
}

const mb = (n) => (n / 1e6).toFixed(2);
console.log(`files:     ${files.length} webp`);
console.log(`reencoded: ${reencoded}, skipped: ${skipped}, errors: ${errors}`);
console.log(`before:    ${mb(beforeTotal)} MB`);
console.log(`after:     ${mb(afterTotal)} MB`);
console.log(`saved:     ${mb(beforeTotal - afterTotal)} MB (${(100 * (1 - afterTotal / beforeTotal)).toFixed(1)}%)`);
