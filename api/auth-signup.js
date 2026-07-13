/**
 * /api/auth-signup.js
 * --------------------
 * Vercel serverless function.
 *
 * Accepts: POST { name, email, password }
 * Returns: 200 { user: { id, name, email } }  + sets lev_session cookie
 *          4xx/5xx { error: "message" } on any failure
 *
 * Password is hashed locally with Node's crypto.scrypt (see _users.js)
 * — no bcrypt or other new dependency required.
 */

const {
  getUserByEmail,
  createUser,
  hashPassword,
  createSession,
  sessionCookie,
  publicUser,
} = require("./_users");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sendJSON(res, status, body) {
  res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJSON(res, 405, { error: "Method not allowed. Use POST." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return sendJSON(res, 400, { error: "Invalid JSON body." });
    }
  }
  body = body || {};
  const { name, email, password } = body;

  if (typeof name !== "string" || !name.trim()) {
    return sendJSON(res, 400, { error: "Please enter your full name." });
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return sendJSON(res, 400, { error: "Please enter a valid email address." });
  }
  if (typeof password !== "string" || password.length < 8) {
    return sendJSON(res, 400, { error: "Password must be at least 8 characters." });
  }

  try {
    const existing = await getUserByEmail(email);
    if (existing) {
      return sendJSON(res, 409, { error: "An account with that email already exists. Try signing in instead." });
    }

    const { hash, salt } = hashPassword(password);
    const user = await createUser({
      name: name.trim(),
      email,
      passwordHash: hash,
      passwordSalt: salt,
    });
    const sessionId = await createSession(user);

    res.setHeader("Set-Cookie", sessionCookie(sessionId));
    return sendJSON(res, 200, { user: publicUser(user) });
  } catch (err) {
    console.error("Signup failed:", err);
    return sendJSON(res, 500, { error: "Could not create your account. Please try again." });
  }
};