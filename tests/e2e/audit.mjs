#!/usr/bin/env node
/**
 * Visual audit: real-browser screenshots of every public page (and the admin
 * login/dashboard) at the project's reference viewports, plus layout metrics.
 *
 *   npm run build && npm start &
 *   [E2E_ADMIN_USER=… E2E_ADMIN_PASS=…] npm run audit:visual [-- hero pages admin] [--only=390x844,…]
 *
 * Output: tests/e2e/output/audit/*.jpg (one contact sheet per page × viewport)
 * and a console report of overflow, small tap targets and tiny text.
 * Screenshots are meant to be LOOKED AT — the metrics only catch the obvious.
 */
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const BASE = (process.env.BASE_URL || "http://localhost:3100").replace(/\/$/, "");
const OUT = new URL("./output/audit/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

async function load(name) {
  try {
    return await import(name);
  } catch {
    return createRequire(`${execSync("npm root -g").toString().trim()}/`)(name);
  }
}
const pw = await load("playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const sharpMod = await load("sharp");
const sharp = sharpMod.default ?? sharpMod;

export const VIEWPORTS = [
  [360, 800],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1024, 768],
  [1440, 900],
  [1920, 1080],
];

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith("--only="))?.slice(7).split(",");
const sections = args.filter((a) => !a.startsWith("--"));
const want = (name) => sections.length === 0 || sections.includes(name);
const viewports = VIEWPORTS.filter(([w, h]) => !only || only.includes(`${w}x${h}`));
const HERO_STOPS = [0, 0.3, 0.42, 0.56, 0.62, 0.75, 1];

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

async function sheet(name, shots, cols, cellWidth) {
  const cells = await Promise.all(shots.map((b) => sharp(b).resize({ width: cellWidth }).toBuffer({ resolveWithObject: true })));
  const h = Math.max(...cells.map((c) => c.info.height));
  const rows = Math.ceil(cells.length / cols);
  await sharp({ create: { width: cellWidth * cols + (cols - 1) * 6, height: h * rows + (rows - 1) * 6, channels: 3, background: "#ff00ff" } })
    .composite(cells.map((c, i) => ({ input: c.data, left: (i % cols) * (cellWidth + 6), top: Math.floor(i / cols) * (h + 6) })))
    .jpeg({ quality: 84 })
    .toFile(`${OUT}${name}.jpg`);
}

/** Layout problems that can be measured: overflow, clipped text, small tap targets, tiny text. */
function metrics() {
  const vw = document.documentElement.clientWidth;
  const out = { overflow: document.documentElement.scrollWidth - vw, wide: [], taps: [], tiny: [], clipped: [] };
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const label = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""} "${(el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 28)}"`;
  const scrollerAncestor = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true;
    }
    return false;
  };
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 2 && r.height <= 2) continue; // visually-hidden helpers such as the skip link
    if ((r.right > vw + 1 || r.left < -1) && !scrollerAncestor(el) && getComputedStyle(el).position !== "fixed") out.wide.push(`${label(el)} [${Math.round(r.left)}..${Math.round(r.right)}]`);
    if (el.matches("a[href], button, input:not([type=hidden]), select, [role=switch]")) {
      const inline = el.tagName === "A" && getComputedStyle(el).display === "inline";
      if (!inline && (r.height < 40 || r.width < 40)) out.taps.push(`${label(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
      if (inline && r.height < 24) out.taps.push(`${label(el)} inline ${Math.round(r.height)}px tall`);
    }
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (own) {
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 11.5) out.tiny.push(`${label(el)} ${size}px`);
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX !== "visible") out.clipped.push(label(el));
    }
  }
  for (const k of ["wide", "taps", "tiny", "clipped"]) out[k] = [...new Set(out[k])].slice(0, 6);
  return out;
}

function report(tag, m) {
  const parts = [`overflow=${m.overflow}`];
  for (const k of ["wide", "clipped", "taps", "tiny"]) if (m[k].length) parts.push(`\n    ${k}: ${m[k].join(" | ")}`);
  console.log(`${m.overflow > 0 || m.wide.length || m.clipped.length ? "✗" : "·"} ${tag} ${parts.join(" ")}`);
}

async function pageShots(page, max = 16) {
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = page.viewportSize().height;
  // First pass triggers lazy images and reveal animations.
  for (let y = 0; y < total; y += vh) {
    await page.evaluate((v) => scrollTo(0, v), y);
    await page.waitForTimeout(180);
  }
  const shots = [];
  const count = Math.min(max, Math.ceil(total / vh));
  for (let i = 0; i < count; i++) {
    await page.evaluate((v) => scrollTo(0, v), i * vh);
    await page.waitForTimeout(350);
    shots.push(await page.screenshot());
  }
  return shots;
}

for (const [w, h] of viewports) {
  const tag = `${w}x${h}`;
  const mobile = w < 768;
  const cell = w <= 430 ? 250 : w <= 1024 ? 420 : 560;
  const cols = w <= 430 ? 7 : w <= 1024 ? 4 : 3;

  if (want("pages")) {
    const context = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, reducedMotion: "reduce" });
    const page = await context.newPage();
    for (const [name, path] of [
      ["home-fa", "/"],
      ["menu-fa", "/menu"],
      ["home-en", "/en"],
      ["menu-en", "/en/menu"],
      ["404", "/nothing-here"],
    ]) {
      await page.goto(BASE + path, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      report(`${tag} ${name}`, await page.evaluate(metrics));
      await sheet(`${name}-${tag}`, await pageShots(page, name.startsWith("menu") ? 6 : 16), cols, cell);
    }
    // Interactive states: mobile navigation and the gallery lightbox.
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    const extras = [];
    const burger = page.getByRole("button", { name: "باز کردن منو" });
    if (await burger.isVisible()) {
      await burger.click();
      await page.waitForTimeout(900);
      extras.push(await page.screenshot());
      await page.keyboard.press("Escape");
    }
    await page.locator("#gallery").scrollIntoViewIfNeeded();
    await page.locator("#gallery li button").first().click();
    await page.waitForTimeout(900);
    report(`${tag} lightbox`, await page.evaluate(metrics));
    extras.push(await page.screenshot());
    await page.keyboard.press("Escape");
    await page.goto(BASE + "/menu", { waitUntil: "networkidle" });
    await page.getByRole("searchbox").fill("لاته");
    await page.waitForTimeout(400);
    extras.push(await page.screenshot());
    await sheet(`states-${tag}`, extras, extras.length, cell);
    await context.close();
  }

  if (want("admin")) {
    const context = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
    report(`${tag} admin-login`, await page.evaluate(metrics));
    const shots = [await page.screenshot()];
    if (process.env.E2E_ADMIN_USER) {
      await page.fill("#username", process.env.E2E_ADMIN_USER);
      await page.fill("#password", process.env.E2E_ADMIN_PASS);
      await page.getByRole("button", { name: "ورود" }).click();
      await page.waitForURL(`${BASE}/admin`);
      for (const path of ["/admin", "/admin/items", "/admin/items/new", "/admin/settings"]) {
        await page.goto(BASE + path, { waitUntil: "networkidle" });
        report(`${tag} ${path}`, await page.evaluate(metrics));
        shots.push(await page.screenshot());
      }
    }
    await sheet(`admin-${tag}`, shots, shots.length, cell);
    await context.close();
  }

  if (want("hero")) {
    // English hero: every viewport on a full run, or only those listed in --en=390x844,…
    const enList = args.find((x) => x.startsWith("--en="))?.slice(5).split(",");
    const withEn = enList ? enList.includes(tag) : sections.length === 0;
    for (const [lang, path] of [["fa", "/"], ...(withEn ? [["en", "/en"]] : [])]) {
      const context = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
      const page = await context.newPage();
      await page.goto(BASE + path, { waitUntil: "networkidle" });
      await page.waitForFunction(() => getComputedStyle(document.querySelector("canvas")).opacity === "1", null, { timeout: 120000 });
      await page.waitForTimeout(1800);
      const distance = await page.evaluate(() => (document.querySelector(".pin-spacer")?.getBoundingClientRect().height ?? 0) - innerHeight);
      const shots = [];
      for (const stop of lang === "fa" ? HERO_STOPS : [0, 0.3, 0.75, 1]) {
        await page.evaluate((y) => scrollTo(0, y), distance * stop);
        await page.waitForFunction((t) => Math.abs(Number(document.querySelector("[data-progress]")?.dataset.progress ?? 0) - t) < 0.004, stop, { timeout: 180000, polling: 250 });
        await page.waitForTimeout(900);
        shots.push(await page.screenshot());
      }
      console.log(`· ${tag} hero-${lang}: pin distance ${Math.round(distance)}px = ${(distance / h).toFixed(2)} screens`);
      await sheet(`hero-${lang}-${tag}`, shots, shots.length, w <= 430 ? 250 : 400);
      await context.close();
    }
  }
}

await browser.close();
console.log(`\nScreenshots: ${OUT}`);
