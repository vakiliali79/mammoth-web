import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPassword } from "./password.mjs";
import { createToken, verifyToken } from "./token";

const COOKIE = "mammoth_admin";
const MAX_AGE = 60 * 60 * 12; // 12 hours

interface AuthConfig {
  username: string;
  passwordHash: string;
  /** Signing key. Derived from the secret AND the password hash, so changing the password logs everyone out. */
  key: string;
}

/** Returns null when the admin area has not been configured yet (no default credentials exist). */
export function getAuthConfig(): AuthConfig | null {
  const username = process.env.ADMIN_USERNAME?.trim();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const secret = process.env.SESSION_SECRET?.trim();
  if (!username || !passwordHash || !secret || secret.length < 32) return null;
  const key = createHmac("sha256", secret).update(passwordHash).digest("hex");
  return { username, passwordHash, key };
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHmac("sha256", "cmp").update(a).digest();
  const hb = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkCredentials(username: string, password: string): boolean {
  const config = getAuthConfig();
  if (!config) return false;
  // Always run the password check so timing does not reveal a valid username.
  const passwordOk = verifyPassword(password, config.passwordHash);
  return safeEqual(username, config.username) && passwordOk;
}

export async function startSession(username: string): Promise<void> {
  const config = getAuthConfig();
  if (!config) throw new Error("Admin is not configured");
  const token = createToken({ u: username, exp: Math.floor(Date.now() / 1000) + MAX_AGE }, config.key);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
    path: "/admin",
    maxAge: MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).set(COOKIE, "", { httpOnly: true, path: "/admin", maxAge: 0 });
}

export async function getSession(): Promise<{ username: string } | null> {
  const config = getAuthConfig();
  if (!config) return null;
  const payload = verifyToken((await cookies()).get(COOKIE)?.value, config.key);
  if (!payload || payload.u !== config.username) return null;
  return { username: payload.u };
}

/** Call at the top of every admin page AND every admin server action. */
export async function requireAdmin(): Promise<{ username: string }> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}
