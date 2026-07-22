import { chromium, webkit } from "playwright";

const which = process.argv[2] || "webkit";
const browser =
  which === "chrome"
    ? await chromium.launch({ channel: "chrome", headless: false })
    : await webkit.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on("console", (m) => {
  const t = m.text();
  if (t.startsWith("[MUT]")) console.log(t);
});

await page.addInitScript(() => {
  // capture stacks for every inline visibility write on .s06-ca
  const desc = Object.getOwnPropertyDescriptor(
    CSSStyleDeclaration.prototype,
    "visibility",
  );
  // GSAP writes style.visibility via property assignment; intercept it
  Object.defineProperty(CSSStyleDeclaration.prototype, "visibility", {
    get() {
      return this.getPropertyValue("visibility");
    },
    set(v) {
      try {
        const owner = this.__el || null;
        // find owning element lazily: match against s06-ca style objects
        const ca = document.querySelector("#s06 .stage--d .s06-ca");
        if (ca && ca.style === this) {
          console.log(
            `[MUT] t=${(performance.now() / 1000).toFixed(2)}s set visibility="${v}"\n` +
              new Error().stack.split("\n").slice(1, 8).join("\n"),
          );
        }
      } catch {}
      this.setProperty("visibility", v);
    },
    configurable: true,
  });
});

await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(6000);
const res = await page.evaluate(() => {
  const ca = document.querySelector("#s06 .stage--d .s06-ca");
  return `inline="${ca.style.visibility}"`;
});
console.log(which, "final at load:", res);
await browser.close();
