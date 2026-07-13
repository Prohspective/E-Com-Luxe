/**
 * /api/_users.js
 * ---------------
 * Small helper around Vercel KV for user accounts + sessions. Mirrors
 * the pattern used elsewhere in /api (see _products.js): one focused
 * module, plain KV keys, no ORM, no extra dependencies.
 *
 * Password hashing uses Node's built-in crypto.scrypt — no bcrypt
 * dependency needed.
 *
 * KV KEYS:
 *   user:<email>        -> { id, name, email, passwordHash, passwordSalt, googleId, createdAt }
 *   session:<sessionId>  -> { userId, email, name, createdAt }  (auto-expires via KV ttl)
 */

const { kv } = require("@vercel/kv");
const crypto = require("crypto");

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function userKey(email) {
  return `user:${email.trim().toLowerCase()}`;
}

function sessionKey(sessionId) {
  return `session:${sessionId}`;
}

async function getUserByEmail(email) {
  return kv.get(userKey(email));
}

async function createUser({ name, email, passwordHash, passwordSalt, googleId }) {
  const user = {
    id: crypto.randomUUID(),
    name,
    email: email.trim().toLowerCase(),
    passwordHash: passwordHash || null,
    passwordSalt: passwordSalt || null,
    googleId: googleId || null,
    createdAt: new Date().toISOString(),
  };
  await kv.set(userKey(user.email), user);
  return user;
}

async function linkGoogleId(email, googleId) {
  const user = await getUserByEmail(email);
  if (!user) return null;
  user.googleId = googleId;
  await kv.set(userKey(email), user);
  return user;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

function verifyPassword(password, salt, hash) {
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(password, salt, 64).toString("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(check, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false; // length mismatch etc. — treat as invalid, never throw
  }
}

async function createSession(user) {
  const sessionId = crypto.randomBytes(32).toString("hex");
  await kv.set(
    sessionKey(sessionId),
    { userId: user.id, email: user.email, name: user.name, createdAt: new Date().toISOString() },
    { ex: SESSION_TTL_SECONDS }
  );
  return sessionId;
}

async function getSession(sessionId) {
  if (!sessionId) return null;
  return kv.get(sessionKey(sessionId));
}

async function destroySession(sessionId) {
  if (!sessionId) return;
  await kv.del(sessionKey(sessionId));
}

// Builds a Set-Cookie header value. Pass clear:true to expire it (logout).
function sessionCookie(sessionId, { clear = false } = {}) {
  const isProd = process.env.NODE_ENV === "production";
  const attrs = [
    `lev_session=${clear ? "" : sessionId}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    clear ? "Max-Age=0" : `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (isProd) attrs.push("Secure");
  return attrs.join("; ");
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

module.exports = {
  getUserByEmail,
  createUser,
  linkGoogleId,
  hashPassword,
  verifyPassword,
  createSession,
  getSession,
  destroySession,
  sessionCookie,
  publicUser,
};