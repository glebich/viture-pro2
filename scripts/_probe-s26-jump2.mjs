import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
const p = await ctx.newPage();
await p.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await p.waitForTimeout(4000);
await p.evaluate(() => {
  window.__log = [];
  const L = (tag, extra) => window.__log.push([Math.round(performance.now()), tag, Math.round(scrollY), extra ?? ""]);
  const lenis = window.__viture.lenis;
  const origScrollTo = lenis.scrollTo.bind(lenis);
  lenis.scrollTo = (t, o) => { L("lenis.scrollTo", (typeof t === "number" ? Math.round(t) : "el") + " " + (o ? Object.keys(o).join("+") : "")); return origScrollTo(t, o); };
  const origResize = lenis.resize.bind(lenis);
  lenis.resize = () => { L("lenis.resize"); return origResize(); };
  const w = window.scrollTo.bind(window);
  window.scrollTo = (...a) => { L("window.scrollTo", JSON.stringify(a).slice(0, 40)); return w(...a); };
  const ST = window.__viture.ScrollTrigger;
  const origRefresh = ST.refresh.bind(ST);
  ST.refresh = (...a) => { L("ST.refresh"); return origRefresh(...a); };
  ST.addEventListener("refresh", () => L("ST.refresh-event"));
  ST.addEventListener("scrollStart", () => L("ST.scrollStart"));
  ST.addEventListener("scrollEnd", () => L("ST.scrollEnd"));
  const origFocus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (...a) { L("focus()", this.tagName + "." + this.className); return origFocus.apply(this, a); };
  const origSiv = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function (...a) { L("scrollIntoView", this.tagName + "." + String(this.className).slice(0,40)); return origSiv.apply(this, a); };
  document.addEventListener("focusin", (e) => L("focusin", e.target.tagName + "." + String(e.target.className).slice(0,40)), true);
  const desc = Object.getOwnPropertyDescriptor(Element.prototype, "scrollTop");
  Object.defineProperty(Element.prototype, "scrollTop", {
    get() { return desc.get.call(this); },
    set(v) { if (this === document.scrollingElement || this === document.documentElement) L("scrollTop=", Math.round(v)); return desc.set.call(this, v); },
  });
});
const top = await p.evaluate(() => Math.round(document.getElementById("s26").parentElement.getBoundingClientRect().top + scrollY));
await p.evaluate((y) => window.__viture.lenis.scrollTo(y, { immediate: true }), top - 400);
await p.waitForTimeout(600);
const cdp = await ctx.newCDPSession(p);
const flick = async () => {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 187, y: 650 }] });
  for (let i = 1; i <= 8; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 187, y: 650 - i * 56 }] }); await p.waitForTimeout(16); }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
};
// also record per-frame scrollY to find the reversal moment
await p.evaluate(() => {
  window.__frames = [];
  const tick = () => { window.__frames.push([Math.round(performance.now()), Math.round(scrollY)]); if (window.__frames.length < 500) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
for (let i = 0; i < 4; i++) { await flick(); await p.waitForTimeout(500); }
const { log, frames } = await p.evaluate(() => ({ log: window.__log, frames: window.__frames }));
let rev = null, prev = null;
for (const f of frames) { if (prev && f[1] < prev[1] - 5) { rev = f[0]; console.log("REVERSAL at t=" + f[0], prev, "->", f); } prev = f; }
console.log("FULL LOG:", JSON.stringify(log));
const anatomy = await p.evaluate(() => ({
  s01: !!document.getElementById("s01"),
  tops: [...document.querySelectorAll("main > *")].map(e => (e.id || e.className.split(" ")[0]) + ":" + Math.round(e.getBoundingClientRect().top + scrollY) + "+" + Math.round(e.getBoundingClientRect().height)),
}));
console.log("ANATOMY:", JSON.stringify(anatomy));
await b.close();
