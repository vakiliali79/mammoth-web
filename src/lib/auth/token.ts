import { createHmac, timingSafeEqual } from "node:crypto";

/** Stateless signed session tokens: base64url(payload).base64url(hmac). */

export interface SessionPayload {
  u: string;
  /** expiry, epoch seconds */
  exp: number;
}

const sign = (body: string, key: string) => createHmac("sha256", key).update(body).digest("base64url");

export function createToken(payload: SessionPayload, key: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, key)}`;
}

export function verifyToken(token: string | undefined, key: string, now = Date.now()): SessionPayload | null {
  if (!token) return null;
  const [body, mac, extra] = token.split(".");
  if (!body || !mac || extra !== undefined) return null;
  const expected = Buffer.from(sign(body, key));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.u !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp * 1000 < now) return null;
    return payload;
  } catch {
    return null;
  }
}
