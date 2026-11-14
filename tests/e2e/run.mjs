#!/usr/bin/env node
/**
 * End-to-end checks against a RUNNING production server.
 *
 *   npm run build && npm start            # in one terminal (with admin env set)
 *   E2E_ADMIN_USER=… E2E_ADMIN_PASS=… npm run test:e2e
 *
 * Uses Playwright's Chromium with software WebGL so the 3D scene really renders.
 * Admin tests are skipped (and reported as skipped) without credentials.
 */
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const BASE = (process.env.BASE_URL || "http://localhost:3100").replace(/\/$/, "");
const USER = process.env.E2E_ADMIN_USER;
const PASS = process.env.E2E_ADMIN_PASS;
const OUT = new URL("./output/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

async function load(name) {
  try {
    return await import(name);
  } catch {
    const root = execSync("npm root -g").toString().trim();
    return createRequire(`${root}/`)(name);
  }
}
const pw = await load("playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const sharpMod = await load("sharp");
const sharp = sharpMod.default ?? sharpMod;

const results = [];
let keepContext = null;
let failed = 0;
const openContexts = new Set();
async function test(name, fn) {
  const started = Date.now();
  try {
    const note = await fn();
    results.push(`✓ ${name}${note ? ` — ${note}` : ""} (${Date.now() - started}ms)`);
  } catch (err) {
    failed++;
    results.push(`✗ ${name}\n    ${String(err?.message ?? err).split("\n").slice(0, 4).join("\n    ")}`);
  }
  // Never leave a page rendering WebGL in the background after a failed test.
  for (const c of openContexts) if (c !== keepContext) await c.close().catch(() => {});
  if (!keepContext) openContexts.clear();
  console.log(results.at(-1));
}
const skip = (name, why) => {
  results.push(`– ${name} (skipped: ${why})`);
  console.log(results.at(-1));
};
function assert(cond, message) {
  if (!cond) throw new Error(message);
}
/** Persian numerals use "٬" as the thousands separator; compare digits only. */
const digits = (text) => text.replace(/[٬,]/g, "");
const hash = (buf) => createHash("sha1").update(buf).digest("hex");

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

async function open(path, { mobile = false, reducedMotion = "no-preference", small = false } = {}) {
  const context = await browser.newContext({
    // `small` keeps software-rendered WebGL fast enough for the animation tests
    viewport: mobile ? { width: 390, height: 844 } : small ? { width: 1024, height: 640 } : { width: 1366, height: 800 },
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion,
  });
  openContexts.add(context);
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  const response = await page.goto(BASE + path, { waitUntil: "networkidle" });
  return { page, context, errors, response };
}

const waitHero = (page) => page.waitForFunction(() => getComputedStyle(document.querySelector("canvas")).opacity === "1", null, { timeout: 90000 });
/** Scrolls to a fraction of the pinned distance and waits until the scrubbed timeline has caught up. */
async function scrubTo(page, distance, stop) {
  await page.evaluate((y) => scrollTo(0, y), distance * stop);
  await page.waitForFunction(
    (target) => Math.abs(Number(document.querySelector("[data-progress]")?.dataset.progress ?? 0) - target) < 0.004,
    stop,
    { timeout: 90000, polling: 200 },
  );
  await page.waitForTimeout(700);
}
const pinDistance = (page) => page.evaluate(() => (document.querySelector(".pin-spacer")?.getBoundingClientRect().height ?? 0) - innerHeight);
/** Hides/shows the animated DOM overlays so that only WebGL pixels are compared. */
async function overlays(page, visible) {
  await page.evaluate((show) => {
    let el = document.getElementById("e2e-hide");
    if (!el) {
      el = document.createElement("style");
      el.id = "e2e-hide";
      el.textContent = "html.e2e-hide [data-hint],html.e2e-hide [data-scene],html.e2e-hide header{visibility:hidden!important}";
      document.head.append(el);
    }
    document.documentElement.classList.toggle("e2e-hide", !show);
  }, visible);
  await page.waitForTimeout(350);
}
async function canvasShot(page) {
  await overlays(page, false);
  return page.locator("canvas").screenshot();
}

// ─── Homepage ─────────────────────────────────────────────────────────────
await test("home: Persian RTL document, brand, headline, no console errors", async () => {
  const { page, context, errors, response } = await open("/");
  assert(response.status() === 200, `status ${response.status()}`);
  assert((await page.getAttribute("html", "lang")) === "fa", "lang");
  assert((await page.getAttribute("html", "dir")) === "rtl", "dir");
  assert((await page.locator("h1").innerText()).replace(/\s+/g, " ").includes("MAMMOTH CAFE"), "h1");
  assert(await page.getByText("هر فنجان، یک تجربه متفاوت").first().isVisible(), "headline");
  assert(await page.getByText("قهوه خوب، اتفاقی نیست").count(), "intro headline");
  await waitHero(page);
  assert(errors.length === 0, `console errors: ${errors.join(" | ")}`);
  await context.close();
});

await test("home: scroll-driven coffee animation is pinned and scrubbed by scroll", async () => {
  const { page, context, errors } = await open("/", { small: true });
  await waitHero(page);
  const distance = await pinDistance(page);
  assert(distance > 2000, `pin distance ${distance}`);
  const frames = {};
  for (const stop of [0, 0.33, 0.57, 0.75, 1]) {
    await scrubTo(page, distance, stop);
    const top = await page.evaluate(() => document.querySelector("canvas").getBoundingClientRect().top);
    assert(Math.abs(top) < 2, `hero not pinned at ${stop} (top=${top})`);
    await overlays(page, true);
    await page.screenshot({ path: `${OUT}hero-${String(Math.round(stop * 100)).padStart(3, "0")}.png` });
    frames[stop] = await canvasShot(page);
  }
  const unique = new Set(Object.values(frames).map(hash));
  assert(unique.size === 5, `expected 5 distinct frames, got ${unique.size}`);
  // caption for the pour scene is visible mid-pour and hidden at the start
  await scrubTo(page, distance, 0.3);
  const o = await page.evaluate(() => Number(getComputedStyle(document.querySelector("[data-scene='1']")).opacity));
  assert(o > 0.9, `pour caption opacity ${o}`);
  // scrolling back up rewinds the animation to the first frame
  await scrubTo(page, distance, 0);
  const o0 = await page.evaluate(() => Number(getComputedStyle(document.querySelector("[data-scene='1']")).opacity));
  assert(o0 < 0.05, `caption should be hidden at top (${o0})`);
  assert(errors.length === 0, `console errors: ${errors.join(" | ")}`);
  await context.close();
  return `pin distance ${Math.round(distance)}px, 5 distinct frames`;
});

await test("home: steam keeps moving while scroll is idle; empty cup scene is static", async () => {
  const { page, context } = await open("/", { small: true });
  await waitHero(page);
  await page.waitForTimeout(3500); // let the fade-in finish
  const a0 = hash(await canvasShot(page));
  await page.waitForTimeout(700);
  const a1 = hash(await canvasShot(page));
  assert(a0 === a1, "intro frame should be static when nothing animates");
  const distance = await pinDistance(page);
  await scrubTo(page, distance, 0.76);
  const b0 = hash(await canvasShot(page));
  await page.waitForTimeout(700);
  const b1 = hash(await canvasShot(page));
  assert(b0 !== b1, "steam should animate without scrolling");
  await context.close();
});

await test("home: reduced motion → no pinning, static finished cup", async () => {
  const { page, context, errors } = await open("/", { reducedMotion: "reduce" });
  await waitHero(page);
  assert((await page.locator(".pin-spacer").count()) === 0, "must not pin");
  const a = hash(await canvasShot(page));
  await page.waitForTimeout(600);
  assert(a === hash(await canvasShot(page)), "canvas must be still");
  assert(errors.length === 0, errors.join(" | "));
  await context.close();
});

await test("home (mobile 390px): renders, no horizontal overflow, mobile nav works", async () => {
  const { page, context, errors } = await open("/", { mobile: true });
  await waitHero(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert(overflow <= 0, `horizontal overflow ${overflow}px`);
  await page.getByRole("button", { name: "باز کردن منو" }).click();
  await page.waitForTimeout(700);
  assert(await page.locator("#mobile-nav").getByRole("link", { name: "گالری" }).isVisible(), "mobile nav link visible");
  await page.screenshot({ path: `${OUT}mobile-nav.png` });
  await page.keyboard.press("Escape");
  const distance = await pinDistance(page);
  await scrubTo(page, distance, 0.75);
  await page.screenshot({ path: `${OUT}mobile-hero-075.png` });
  assert(errors.length === 0, errors.join(" | "));
  await context.close();
});

await test("home: sections, gallery lightbox, structured data", async () => {
  const { page, context } = await open("/", { reducedMotion: "reduce" });
  for (const id of ["story", "experience", "gallery", "contact"]) assert(await page.locator(`#${id}`).count(), `#${id} missing`);
  const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
  assert(ld["@type"] === "CafeOrCoffeeShop", "JSON-LD type");
  await page.locator("#gallery").scrollIntoViewIfNeeded();
  await page.locator("#gallery li button").first().click();
  assert(await page.locator("dialog[open]").isVisible(), "lightbox opens");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  assert((await page.locator("dialog[open]").count()) === 0, "lightbox closes");
  await page.locator("footer").scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}footer.png` });
  await context.close();
});

// ─── Menu ─────────────────────────────────────────────────────────────────
await test("menu: categories, search, unavailable state, category navigation", async () => {
  const { page, context, errors } = await open("/menu");
  const sections = await page.locator("[data-menu-section]").count();
  assert(sections >= 1, "no categories rendered");
  const allItems = await page.locator("[data-item]").count();
  assert((await page.locator("[data-chip]").count()) === sections, "chips match sections");

  await page.getByRole("searchbox").fill("لاته");
  await page.waitForTimeout(200);
  const found = await page.locator("[data-item]").count();
  assert(found > 0 && found < allItems, `search should narrow results (${found}/${allItems})`);
  for (const text of await page.locator("[data-item] h3").allInnerTexts()) assert(/لاته/.test(text), `unexpected result: ${text}`);

  await page.getByRole("searchbox").fill("latte");
  await page.waitForTimeout(200);
  assert((await page.locator("[data-item]").count()) > 0, "english search");

  await page.getByRole("searchbox").fill("zzzzqqq");
  await page.waitForTimeout(200);
  assert(await page.getByText("محصولی با این مشخصات پیدا نشد.").isVisible(), "empty state");
  await page.getByRole("button", { name: "پاک کردن جستجو" }).last().click();
  await page.waitForTimeout(200);
  assert((await page.locator("[data-item]").count()) === allItems, "clear restores all");

  const off = page.locator('[data-item][data-available="false"]').first();
  if (await off.count()) assert(await off.getByText("ناموجود").isVisible(), "unavailable badge");

  const lastChip = page.locator("[data-chip]").last();
  const slug = await lastChip.getAttribute("data-chip");
  await lastChip.click();
  await page.waitForTimeout(1600);
  const top = await page.evaluate((id) => document.getElementById(id).getBoundingClientRect().top, slug);
  assert(top > 0 && top < 400, `category did not scroll into view (top=${top})`);
  assert((await lastChip.getAttribute("aria-current")) === "true", "chip active");
  assert(await page.getByText("تومان").first().isVisible(), "prices in Toman");
  assert(errors.length === 0, errors.join(" | "));
  await page.screenshot({ path: `${OUT}menu.png` });
  await context.close();
  return `${sections} categories, ${allItems} items`;
});

await test("menu (mobile): no horizontal overflow", async () => {
  const { page, context } = await open("/menu", { mobile: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert(overflow <= 0, `horizontal overflow ${overflow}px`);
  await page.screenshot({ path: `${OUT}menu-mobile.png` });
  await context.close();
});

// ─── i18n, 404, SEO files ─────────────────────────────────────────────────
await test("english: /en and /en/menu are LTR", async () => {
  const { page, context } = await open("/en", { reducedMotion: "reduce" });
  assert((await page.getAttribute("html", "dir")) === "ltr" && (await page.getAttribute("html", "lang")) === "en", "ltr/en");
  assert(await page.getByText("Good coffee is no accident").count(), "english copy");
  await page.goto(`${BASE}/en/menu`);
  assert(await page.getByRole("heading", { name: "The Mammoth Menu" }).isVisible(), "menu title");
  const r = await page.request.get(`${BASE}/fa/menu`, { maxRedirects: 0 });
  assert(r.status() === 308 && r.headers().location.endsWith("/menu"), "/fa/menu redirects to /menu");
  await context.close();
});

await test("404: branded page with 404 status", async () => {
  const { page, context, response } = await open("/no-such-page");
  assert(response.status() === 404, `status ${response.status()}`);
  assert(await page.getByText("این فنجان خالی است").isVisible(), "404 copy");
  const en = await page.goto(`${BASE}/en/nope/deeper`);
  assert(en.status() === 404 && (await page.getByText("This cup is empty").isVisible()), "english 404");
  await page.screenshot({ path: `${OUT}404.png` });
  await context.close();
});

await test("seo: robots.txt, sitemap.xml, og image, metadata", async () => {
  const { page, context } = await open("/menu");
  const robots = await (await page.request.get(`${BASE}/robots.txt`)).text();
  assert(/Disallow: \/admin/.test(robots) && /Sitemap:/.test(robots), "robots");
  const sitemap = await (await page.request.get(`${BASE}/sitemap.xml`)).text();
  assert(sitemap.includes("/menu") && sitemap.includes("/en"), "sitemap");
  assert((await page.request.get(`${BASE}/og.jpg`)).status() === 200, "og.jpg");
  assert((await page.title()).includes("منو"), "menu title");
  assert(await page.locator('meta[property="og:image"]').count(), "og:image");
  assert(await page.locator('link[rel="alternate"][hreflang="en"]').count(), "hreflang");
  assert((await page.locator('meta[name="description"]').getAttribute("content")).length > 40, "description");
  await context.close();
});

await test("links & images: nothing broken on / and /menu", async () => {
  const { page, context } = await open("/", { reducedMotion: "reduce" });
  const urls = new Set();
  for (const path of ["/", "/menu", "/en"]) {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    for (const href of await page.locator("a[href]").evaluateAll((as) => as.map((a) => a.href))) {
      if (href.startsWith(BASE)) urls.add(href.split("#")[0]);
    }
    for (const src of await page.locator("img").evaluateAll((imgs) => imgs.map((i) => i.currentSrc || i.src))) {
      if (src.startsWith(BASE)) urls.add(src);
    }
  }
  const broken = [];
  for (const url of urls) {
    const r = await page.request.get(url);
    if (r.status() >= 400) broken.push(`${r.status()} ${url}`);
  }
  assert(broken.length === 0, `broken: ${broken.join(", ")}`);
  await context.close();
  return `${urls.size} URLs checked`;
});

// ─── Admin ────────────────────────────────────────────────────────────────
await test("admin: unauthenticated access is redirected to login; noindex header", async () => {
  const { page, context, response } = await open("/admin/items");
  assert(page.url().endsWith("/admin/login"), `landed on ${page.url()}`);
  assert(/noindex/.test(response.headers()["x-robots-tag"] ?? ""), "X-Robots-Tag");
  await context.close();
});

if (!USER || !PASS) {
  skip("admin: login, CRUD, uploads, settings", "set E2E_ADMIN_USER / E2E_ADMIN_PASS");
} else {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  keepContext = context;
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  const stamp = Date.now().toString(36);
  const itemName = `تست قهوه ${stamp}`;
  const slug = `test-${stamp}`;
  const png = await sharp({ create: { width: 900, height: 700, channels: 3, background: "#a66a3f" } }).png().toBuffer();

  await test("admin: wrong password is rejected, correct login works", async () => {
    await page.goto(`${BASE}/admin/login`);
    await page.fill("#username", USER);
    await page.fill("#password", "definitely-wrong");
    await page.getByRole("button", { name: "ورود" }).click();
    await page.locator('[data-form-message="error"]').waitFor();
    assert(page.url().endsWith("/admin/login"), "still on login");
    await page.fill("#password", PASS);
    await page.getByRole("button", { name: "ورود" }).click();
    await page.waitForURL(`${BASE}/admin`);
    assert(await page.getByRole("heading", { name: "پیشخوان" }).isVisible(), "dashboard");
    const cookie = (await context.cookies()).find((c) => c.name === "mammoth_admin");
    assert(cookie?.httpOnly, "session cookie must be httpOnly");
    assert(!(await page.content()).includes(PASS), "password must never be echoed");
  });

  await test("admin: create category (with validation)", async () => {
    await page.goto(`${BASE}/admin/categories`);
    const form = page.locator('[data-category="new"]');
    await form.locator('input[name="nameFa"]').fill(`دسته تست ${stamp}`);
    await form.locator('input[name="nameEn"]').fill("Test Category");
    await form.locator('input[name="slug"]').fill("hot-coffee");
    await form.locator('input[name="order"]').fill("50");
    await form.getByRole("button", { name: "افزودن دسته‌بندی" }).click();
    await form.locator('[data-form-message="error"]').waitFor();
    await form.locator('input[name="slug"]').fill(slug);
    await form.getByRole("button", { name: "افزودن دسته‌بندی" }).click();
    await page.locator(`[data-category="${slug}"]`).waitFor();
  });

  let itemId = "";
  await test("admin: add menu item with image upload → visible on public menu", async () => {
    await page.goto(`${BASE}/admin/items/new`);
    await page.fill("#nameFa", itemName);
    await page.fill("#nameEn", "E2E Test Coffee");
    await page.fill("#descriptionFa", "محصول آزمایشی");
    await page.selectOption("#categoryId", { label: `دسته تست ${stamp}` });
    await page.fill("#price", "98000");
    await page.setInputFiles("#imageFile", { name: "test.png", mimeType: "image/png", buffer: png });
    await page.getByRole("button", { name: "افزودن اندازه" }).click();
    await page.getByLabel("عنوان فارسی 1").fill("بزرگ");
    await page.getByLabel("قیمت (تومان) 1").fill("118000");
    await page.getByRole("button", { name: "افزودن محصول" }).click();
    await page.waitForURL(/\/admin\/items\?saved=1/);
    const row = page.locator("[data-item-row]", { hasText: itemName });
    itemId = await row.getAttribute("data-item-row");
    const img = await row.locator("img").getAttribute("src");
    assert(/^\/media\/[a-f0-9-]{36}\.webp$/.test(img), `uploaded image path: ${img}`);
    const media = await page.request.get(BASE + img);
    assert(media.status() === 200 && media.headers()["content-type"] === "image/webp", "uploaded image is served as webp");

    await page.goto(`${BASE}/menu`);
    const card = page.locator(`[data-item="${itemId}"]`);
    assert(await card.isVisible(), "item on public menu");
    assert(digits(await card.innerText()).includes("۱۱۸۰۰۰"), "variant price shown");
    assert(await page.locator(`#${slug}`).count(), "new category section on menu");
  });

  await test("admin: upload rejects non-image files", async () => {
    await page.goto(`${BASE}/admin/items/${itemId}`);
    await page.setInputFiles("#imageFile", { name: "evil.png", mimeType: "image/png", buffer: Buffer.from("<script>alert(1)</script>") });
    await page.getByRole("button", { name: "ذخیره تغییرات" }).click();
    await page.locator('[data-form-message="error"]').waitFor();
  });

  await test("admin: edit item, change price inline, disable product", async () => {
    await page.goto(`${BASE}/admin/items/${itemId}`);
    await page.fill("#descriptionFa", "توضیح ویرایش‌شده");
    await page.getByRole("button", { name: "حذف", exact: true }).first().click(); // remove the size row
    await page.getByRole("button", { name: "ذخیره تغییرات" }).click();
    await page.waitForURL(/\/admin\/items\?saved=1/);

    const priceForm = page.locator(`[data-price-form="${itemId}"]`);
    await priceForm.locator('input[name="price"]').fill("-10");
    await priceForm.evaluate((f) => (f.noValidate = true));
    await priceForm.getByRole("button").click();
    await priceForm.locator('[data-price-status="error"]').waitFor();
    await priceForm.locator('input[name="price"]').fill("111000");
    await priceForm.getByRole("button").click();
    await priceForm.locator('[data-price-status="ok"]').waitFor();

    await page.locator(`[data-toggle="available:${itemId}"]`).click();
    await page.locator(`[data-toggle="available:${itemId}"][aria-checked="false"]`).waitFor();

    await page.goto(`${BASE}/menu`);
    const card = page.locator(`[data-item="${itemId}"]`);
    const text = await card.innerText();
    assert(digits(text).includes("۱۱۱۰۰۰"), `new price shown (${text})`);
    assert(text.includes("توضیح ویرایش‌شده"), "edited description shown");
    assert((await card.getAttribute("data-available")) === "false" && text.includes("ناموجود"), "shown as unavailable");
  });

  await test("admin: featured products drive the homepage", async () => {
    await page.goto(`${BASE}/admin/items`);
    await page.locator(`[data-toggle="available:${itemId}"]`).click();
    await page.locator(`[data-toggle="available:${itemId}"][aria-checked="true"]`).waitFor();
    await page.goto(`${BASE}/admin/featured`);
    await page.locator(`input[name="featured"][value="${itemId}"]`).check();
    await page.locator(`input[name="order:${itemId}"]`).fill("1");
    await page.getByRole("button", { name: "ذخیره" }).click();
    await page.locator('[data-form-message="ok"]').waitFor();
    await page.goto(`${BASE}/`);
    assert(await page.getByRole("heading", { name: itemName }).count(), "featured item on homepage");
  });

  await test("admin: contact details & working hours appear on the site", async () => {
    await page.goto(`${BASE}/admin/settings`);
    const before = {
      addressFa: await page.inputValue("#addressFa"),
      phone: await page.inputValue("#phone"),
      instagram: await page.inputValue("#instagram"),
    };
    await page.fill("#addressFa", `نشانی آزمایشی ${stamp}`);
    await page.fill("#phone", "021-00000000");
    await page.fill("#instagram", "@e2e.test");
    await page.fill("#mapUrl", "not-a-url");
    await page.locator("form:has(#mapUrl)").evaluate((f) => (f.noValidate = true));
    await page.getByRole("button", { name: "ذخیره تنظیمات" }).click();
    await page.locator('[data-form-message="error"]').waitFor();
    await page.fill("#mapUrl", "");
    await page.getByRole("button", { name: "افزودن ردیف" }).click();
    await page.getByLabel("روزها (فارسی) 1").fill("هر روز");
    await page.getByRole("button", { name: "ذخیره تنظیمات" }).click();
    await page.locator('[data-form-message="ok"]').waitFor();

    await page.goto(`${BASE}/`);
    const contact = await page.locator("#contact").innerText();
    assert(contact.includes(`نشانی آزمایشی ${stamp}`), "address on site");
    assert(contact.includes("۰۲۱-۰۰۰۰۰۰۰۰"), "phone on site");
    assert(contact.includes("@e2e.test"), "instagram on site");
    assert(contact.includes("هر روز"), "hours on site");

    // restore
    await page.goto(`${BASE}/admin/settings`);
    await page.fill("#addressFa", before.addressFa);
    await page.fill("#phone", before.phone);
    await page.fill("#instagram", before.instagram);
    await page.locator('[data-rows="hours"]').getByRole("button", { name: "حذف" }).first().click();
    await page.getByRole("button", { name: "ذخیره تنظیمات" }).click();
    await page.locator('[data-form-message="ok"]').waitFor();
  });

  await test("admin: gallery upload and delete", async () => {
    await page.goto(`${BASE}/admin/gallery`);
    const count = await page.locator("[data-gallery-item]").count();
    await page.setInputFiles("#imageFile", { name: "g.png", mimeType: "image/png", buffer: png });
    await page.fill("#altFa-new", `گالری تست ${stamp}`);
    await page.getByRole("button", { name: "افزودن به گالری" }).click();
    await page.locator('[data-form-message="ok"]').first().waitFor();
    await page.reload();
    assert((await page.locator("[data-gallery-item]").count()) === count + 1, "image added");
    const card = page.locator("[data-gallery-item]", { has: page.locator(`input[value="گالری تست ${stamp}"]`) });
    const src = await card.locator("img").getAttribute("src");
    await page.goto(`${BASE}/`);
    assert(await page.locator(`#gallery img[alt="گالری تست ${stamp}"]`).count(), "image in public gallery");
    await page.goto(`${BASE}/admin/gallery`);
    await page.locator("[data-gallery-item]", { has: page.locator(`input[value="گالری تست ${stamp}"]`) }).getByRole("button", { name: "حذف تصویر" }).click();
    await page.waitForFunction((n) => document.querySelectorAll("[data-gallery-item]").length === n, count);
    assert((await page.request.get(BASE + src)).status() === 404, "deleted upload file is removed");
  });

  await test("admin: delete item and category; logout ends the session", async () => {
    await page.goto(`${BASE}/admin/categories`);
    await page.locator(`[data-category="${slug}"]`).getByRole("button", { name: "حذف دسته‌بندی" }).click();
    await page.locator(`[data-category="${slug}"] [data-form-message="error"]`).waitFor(); // still has an item

    await page.goto(`${BASE}/admin/items`);
    const row = page.locator(`[data-item-row="${itemId}"]`);
    const img = await row.locator("img").getAttribute("src");
    await row.getByRole("button", { name: "حذف" }).click();
    await row.waitFor({ state: "detached" });
    assert((await page.request.get(BASE + img)).status() === 404, "item image removed from disk");

    await page.goto(`${BASE}/admin/categories`);
    await page.locator(`[data-category="${slug}"]`).getByRole("button", { name: "حذف دسته‌بندی" }).click();
    await page.locator(`[data-category="${slug}"]`).waitFor({ state: "detached" });

    await page.goto(`${BASE}/menu`);
    assert((await page.locator(`[data-item="${itemId}"]`).count()) === 0, "item gone from menu");

    await page.goto(`${BASE}/admin`);
    await page.getByRole("button", { name: "خروج" }).last().click();
    await page.waitForURL(`${BASE}/admin/login`);
    await page.goto(`${BASE}/admin/settings`);
    assert(page.url().endsWith("/admin/login"), "session ended");
    assert(errors.length === 0, `page errors: ${errors.join(" | ")}`);
  });

  await context.close();
}

await browser.close();
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ""}`);
process.exit(failed ? 1 : 0);
