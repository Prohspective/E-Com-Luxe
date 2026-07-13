/**
 * /api/auth-google.js
 * --------------------
 * Vercel serverless function.
 *
 * GET -> redirects the browser to Google's OAuth 2.0 consent screen.
 * A random `state` value is stored in a short-lived cookie and echoed
 * back by Google so auth-google-callback.js can confirm the response
 * wasn't forged (basic CSRF protection).
 *
 * REQUIRED ENV VARS:
 *   GOOGLE_CLIENT_ID
 *
 * OPTIONAL ENV VARS:
 *   PUBLIC_BASE_URL - used to build the redirect_uri, same convention
 *                      as create-checkout-session.js. Falls back to
 *                      the request's Host header.
 *
 * NOTE: the redirect_uri this sends Google MUST be added, verbatim, to
 * "Authorized redirect URIs" in the Google Cloud OAuth client config,
 * e.g. https://luxeenvogue.com/api/auth-google-callback
 */

const crypto = require("crypto");

module.exports = async function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error("Missing GOOGLE_CLIENT_ID environment variable.");
    return res.status(500).json({ error: "Google sign-in is not configured." });
  }

  const baseUrl = process.env.PUBLIC_BASE_URL || `https://${req.headers.host}`;
  const redirectUri = `${baseUrl.replace(/\/$/, "")}/api/auth-google-callback`;
  const state = crypto.randomBytes(16).toString("hex");

  const isProd = process.env.NODE_ENV === "production";
  res.setHeader(
    "Set-Cookie",
    `lev_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${isProd ? "; Secure" : ""}`
  );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};