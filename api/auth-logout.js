/**
 * /api/auth-logout.js
 * ---------------------
 * Accepts: POST (no body)
 * Returns: 200 { ok: true } and clears the lev_session cookie.
 */

const { destroySession, sessionCookie } = require("./_users");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const sessionId = req.cookies && req.cookies.lev_session;
    await destroySession(sessionId);
    res.setHeader("Set-Cookie", sessionCookie(null, { clear: true }));
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Logout failed:", err);
    // Clear the cookie anyway — client-side state should still reset.
    res.setHeader("Set-Cookie", sessionCookie(null, { clear: true }));
    return res.status(200).json({ ok: true });
  }
};