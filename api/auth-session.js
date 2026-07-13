/**
 * /api/auth-session.js
 * ----------------------
 * Accepts: GET (no body — reads the lev_session cookie)
 * Returns: 200 { user: { id, name, email } | null }
 *
 * Called by auth.js on every page load to decide whether the nav
 * shows "Sign in" or the signed-in user's name.
 */

const { getSession } = require("./_users");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  try {
    const sessionId = req.cookies && req.cookies.lev_session;
    const session = await getSession(sessionId);
    if (!session) {
      return res.status(200).json({ user: null });
    }
    return res.status(200).json({
      user: { id: session.userId, name: session.name, email: session.email },
    });
  } catch (err) {
    console.error("Session check failed:", err);
    return res.status(200).json({ user: null });
  }
};