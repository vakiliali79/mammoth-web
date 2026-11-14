import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "../../src/lib/auth/password.mjs";
import { createToken, verifyToken } from "../../src/lib/auth/token.ts";
import { clearFailures, isBlocked, recordFailure } from "../../src/lib/auth/rate-limit.ts";
import { categoryInputSchema, contactSchema, imagePathSchema, itemInputSchema } from "../../src/lib/data/schema.ts";
import { matchesQuery, normalizeText } from "../../src/lib/search.ts";

test("password hashing round-trips and rejects wrong passwords", () => {
  const hash = hashPassword("correct horse battery");
  assert.match(hash, /^scrypt:\d+:[0-9a-f]+:[0-9a-f]+$/);
  assert.ok(!hash.includes("$"), "hash must be safe inside .env files");
  assert.equal(verifyPassword("correct horse battery", hash), true);
  assert.equal(verifyPassword("wrong", hash), false);
  assert.equal(verifyPassword("x", "garbage"), false);
  assert.equal(verifyPassword("x", undefined), false);
});

test("session tokens verify, expire and resist tampering", () => {
  const key = "k".repeat(40);
  const now = Date.now();
  const token = createToken({ u: "admin", exp: Math.floor(now / 1000) + 60 }, key);
  assert.deepEqual(verifyToken(token, key, now)?.u, "admin");
  assert.equal(verifyToken(token, "other-key", now), null);
  assert.equal(verifyToken(token, key, now + 120_000), null, "expired");
  const [body, mac] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ u: "root", exp: 9999999999 })).toString("base64url");
  assert.equal(verifyToken(`${forged}.${mac}`, key, now), null);
  assert.equal(verifyToken(`${body}.${mac}.x`, key, now), null);
  assert.equal(verifyToken(undefined, key), null);
});

test("login rate limiter blocks after 5 failures and resets", () => {
  const ip = "203.0.113.9";
  for (let i = 0; i < 4; i++) recordFailure(ip, 1000);
  assert.equal(isBlocked(ip, 1000), false);
  recordFailure(ip, 1000);
  assert.equal(isBlocked(ip, 1000), true);
  assert.equal(isBlocked(ip, 1000 + 16 * 60 * 1000), false, "window elapsed");
  recordFailure(ip, 5_000_000);
  clearFailures(ip);
  assert.equal(isBlocked(ip, 5_000_000), false);
});

test("item validation", () => {
  const base = { categoryId: "c", nameFa: "لاته", price: "125000", image: "/images/menu/latte.jpg" };
  const ok = itemInputSchema.parse(base);
  assert.equal(ok.price, 125000);
  assert.equal(ok.available, true);
  assert.deepEqual(ok.variants, []);
  assert.equal(itemInputSchema.safeParse({ ...base, price: "-5" }).success, false);
  assert.equal(itemInputSchema.safeParse({ ...base, price: "abc" }).success, false);
  assert.equal(itemInputSchema.safeParse({ ...base, nameFa: "  " }).success, false);
  assert.equal(itemInputSchema.safeParse({ ...base, variants: [{ labelFa: "", price: 1 }] }).success, false);
});

test("image paths cannot escape the allowed folders", () => {
  assert.equal(imagePathSchema.safeParse("/media/abc.webp").success, true);
  assert.equal(imagePathSchema.safeParse("/images/menu/a.jpg").success, true);
  assert.equal(imagePathSchema.safeParse("/media/../../etc/passwd").success, false);
  assert.equal(imagePathSchema.safeParse("https://evil.example/x.jpg").success, false);
  assert.equal(imagePathSchema.safeParse("javascript:alert(1)").success, false);
});

test("category and contact validation", () => {
  assert.equal(categoryInputSchema.safeParse({ nameFa: "چای", slug: "Tea Time" }).success, false);
  assert.equal(categoryInputSchema.parse({ nameFa: "چای", slug: "tea" }).visible, true);
  const c = contactSchema.parse({ instagram: "@mammoth.cafe", latitude: "", longitude: "", mapUrl: "" });
  assert.equal(c.instagram, "mammoth.cafe");
  assert.equal(c.latitude, null);
  assert.equal(contactSchema.safeParse({ mapUrl: "javascript:alert(1)", latitude: "", longitude: "" }).success, false);
  assert.equal(contactSchema.safeParse({ latitude: "200", longitude: "" }).success, false);
  assert.equal(contactSchema.safeParse({ instagram: "bad/handle", latitude: "", longitude: "" }).success, false);
});

test("search normalises Persian text", () => {
  assert.equal(normalizeText("كيك  شكلاتي"), "کیک شکلاتی");
  assert.equal(matchesQuery("لاته", "آیس لاته", "Iced Latte"), true);
  assert.equal(matchesQuery("LATTE", "آیس لاته", "Iced Latte"), true);
  assert.equal(matchesQuery("قهوه‌های", "قهوه های گرم"), false);
  assert.equal(matchesQuery("قهوههای", "قهوه‌های گرم"), true, "ZWNJ is ignored");
  assert.equal(matchesQuery("چای", "اسپرسو"), false);
  assert.equal(matchesQuery("", "anything"), true);
});
