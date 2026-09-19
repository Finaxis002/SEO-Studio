import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const COOKIE_NAME = "seo_session";
const SESSION_DAYS = 7;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not configured");
  return value;
}

export function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return salt + ":" + hash;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, expected] = stored.split(":");
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return (
    expectedBuffer.length === actual.length &&
    timingSafeEqual(actual, expectedBuffer)
  );
}

export function createSession(userId) {
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, exp: Date.now() + SESSION_DAYS * 86400000 }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
  return payload + "." + signature;
}

export function getSessionUserId(request) {
  const header = request.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim().split("=").map(decodeURIComponent))
      .filter((part) => part.length === 2),
  );
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.exp > Date.now() ? data.sub : null;
  } catch (error) {
    return null;
  }
}

export function sessionCookie(token) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
