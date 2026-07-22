// Build contact sheets (3x3 grids of 632px-wide frames) from a hunt dir.
// Usage: node scripts/hunt-sheet.mjs qa/hunt/c1920 dn
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
const prefix = process.argv[3] ?? "";
const files = fs
  .readdirSync(dir)
  .filter((f) => f.startsWith(prefix) && f.endsWith(".png"))
  .sort();
const TW = 632;
const COLS = 3;
const ROWS = 3;
const meta = await sharp(path.join(dir, files[0])).metadata();
const TH = Math.round((TW * meta.height) / meta.width);
const per = COLS * ROWS;
for (let g = 0; g * per < files.length; g++) {
  const batch = files.slice(g * per, (g + 1) * per);
  const comps = [];
  for (let i = 0; i < batch.length; i++) {
    const buf = await sharp(path.join(dir, batch[i]))
      .resize(TW)
      .toBuffer();
    const label = await sharp({
      text: {
        text: `<span foreground="#0f0" background="#000"> ${batch[i].replace(".png", "")} </span>`,
        rgba: true,
        dpi: 130,
      },
    })
      .png()
      .toBuffer();
    comps.push({ input: buf, left: (i % COLS) * TW, top: Math.floor(i / COLS) * TH });
    comps.push({
      input: label,
      left: (i % COLS) * TW + 6,
      top: Math.floor(i / COLS) * TH + 4,
    });
  }
  await sharp({
    create: {
      width: COLS * TW,
      height: ROWS * TH,
      channels: 3,
      background: { r: 20, g: 20, b: 20 },
    },
  })
    .composite(comps)
    .png()
    .toFile(path.join(dir, `_sheet-${prefix}-${g}.png`));
  console.log(`${dir}/_sheet-${prefix}-${g}.png (${batch.length} frames)`);
}
