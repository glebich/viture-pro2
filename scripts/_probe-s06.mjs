// Diagnostic: snap p 0.60->0.80 and dump computed state of the card layers.
import { chromium } from "playwright";

const base = "http://localhost:5173";
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});

const ps = [];
for (let p = 0.6; p <= 0.801; p += 0.02) ps.push(Math.round(p * 100) / 100);

for (const p of ps) {
  await page.goto(`${base}/?only=s06&progress=${p}`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => {
    const stage = document.querySelector("#s06 .stage--d");
    const pick = (sel) => {
      const n = stage.querySelector(sel);
      if (!n) return { missing: true };
      const cs = getComputedStyle(n);
      const r = n.getBoundingClientRect();
      return {
        opacity: cs.opacity,
        visibility: cs.visibility,
        display: cs.display,
        transform: cs.transform,
        height: cs.height,
        rect: {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
        },
        text: (n.innerText || "").slice(0, 40).replace(/\s+/g, " "),
      };
    };
    return {
      card: pick(".s06-card"),
      cbody: pick(".s06-cbody"),
      ca: pick(".s06-ca"),
      ctext: pick(".s06-ctext"),
      h: pick(".s06-ca .s06-h"),
      cb: pick(".s06-cb"),
      vid: pick(".s06-vid"),
    };
  });
  console.log(`\n=== p=${p} ===`);
  for (const [k, v] of Object.entries(info))
    console.log(
      k.padEnd(6),
      v.missing
        ? "MISSING"
        : `op=${v.opacity} vis=${v.visibility} disp=${v.display} h=${v.height} tf=${v.transform} rect=${JSON.stringify(v.rect)} "${v.text}"`,
    );
}
await browser.close();
