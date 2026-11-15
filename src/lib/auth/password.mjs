// Plain ESM (no TS) so the CLI setup script and the app share one implementation.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const N = 16384;
const KEYLEN = 64;

/** Format: `scrypt:<N>:<saltHex>:<hashHex>` — deliberately free of `$` so .env files don't mangle it. */
export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password.normalize("NFKC"), salt, KEYLEN, { N });
  return `scrypt:${N}:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password, stored) {
  const parts = String(stored || "").split(":");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  if (!Number.isInteger(n) || n < 1024 || n > 1 << 20) return false;
  const salt = Buffer.from(parts[2], "hex");
  const expected = Buffer.from(parts[3], "hex");
  if (!salt.length || !expected.length) return false;
  const actual = scryptSync(String(password).normalize("NFKC"), salt, expected.length, { N: n });
  return timingSafeEqual(actual, expected);
}
