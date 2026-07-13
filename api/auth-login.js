/**
 * /api/auth-login.js
 * --------------------
 * Vercel serverless function.
 *
 * Accepts: POST { email, password }
 * Returns: 200 { user: { id, name, email } }  + sets lev_session cookie
 *          4xx/5xx { error: "message" } on any failure
 *
 * Deliberately vague error message on bad credentials (doesn't reveal
 * whether the email exists) to avoid leaking which emails are registered.
 */

const { getUserByEmail, verifyPassword, createSession, sessionCookie, publicUser } = require("./_users");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BAD_CREDENTIALS = "Incorrect email or password.";

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
  const { email, password } = body;

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return sendJSON(res, 400, { error: "Please enter a valid email address." });
  }
  if (typeof password !== "string" || !password) {
    return sendJSON(res, 400, { error: "Please enter your password." });
  }

  try {
    const user = await getUserByEmail(email);
    if (!user || !user.passwordHash) {
      // Either no account, or the account was created via Google only.
      return sendJSON(res, 401, { error: BAD_CREDENTIALS });
    }

    const ok = verifyPassword(password, user.passwordSalt, user.passwordHash);
    if (!ok) {
      return sendJSON(res, 401, { error: BAD_CREDENTIALS });
    }

    const sessionId = await createSession(user);
    res.setHeader("Set-Cookie", sessionCookie(sessionId));
    return sendJSON(res, 200, { user: publicUser(user) });
  } catch (err) {
    console.error("Login failed:", err);
    return sendJSON(res, 500, { error: "Could not sign you in. Please try again." });
  }
};