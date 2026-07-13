/**
 * /api/auth-google-callback.js
 * ------------------------------
 * Vercel serverless function.
 *
 * Google redirects here after the user approves (or denies) access.
 * Exchanges the authorization code for tokens, fetches the user's
 * Google profile, finds-or-creates the matching account (matched by
 * email), opens a session, and redirects back into the site.
 *
 * REQUIRED ENV VARS:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 */

const { getUserByEmail, createUser, linkGoogleId, createSession, sessionCookie } = require("./_users");

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

module.exports = async function handler(req, res) {
  const { code, state, error } = req.query;
  const baseUrl = process.env.PUBLIC_BASE_URL || `https://${req.headers.host}`;
  const clean = baseUrl.replace(/\/$/, "");
  const signInPage = `${clean}/signin.html`;

  const clearStateCookie = "lev_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";

  if (error) {
    res.setHeader("Set-Cookie", clearStateCookie);
    return res.redirect(`${signInPage}?error=${encodeURIComponent("Google sign-in was cancelled.")}`);
  }

  const cookieState = req.cookies && req.cookies.lev_oauth_state;
  if (!code || !state || !cookieState || state !== cookieState) {
    res.setHeader("Set-Cookie", clearStateCookie);
    return res.redirect(`${signInPage}?error=${encodeURIComponent("Could not verify Google sign-in. Please try again.")}`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET environment variables.");
    res.setHeader("Set-Cookie", clearStateCookie);
    return res.redirect(`${signInPage}?error=${encodeURIComponent("Google sign-in is not configured.")}`);
  }

  try {
    const redirectUri = `${clean}/api/auth-google-callback`;

    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Google token exchange failed:", tokenData);
      res.setHeader("Set-Cookie", clearStateCookie);
      return res.redirect(`${signInPage}?error=${encodeURIComponent("Google sign-in failed. Please try again.")}`);
    }

    const profileRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.email) {
      console.error("Google userinfo failed:", profile);
      res.setHeader("Set-Cookie", clearStateCookie);
      return res.redirect(`${signInPage}?error=${encodeURIComponent("Could not read your Google profile.")}`);
    }

    let user = await getUserByEmail(profile.email);
    if (!user) {
      user = await createUser({
        name: profile.name || profile.email.split("@")[0],
        email: profile.email,
        googleId: profile.sub,
      });
    } else if (!user.googleId) {
      user = await linkGoogleId(profile.email, profile.sub);
    }

    const sessionId = await createSession(user);
    res.setHeader("Set-Cookie", [clearStateCookie, sessionCookie(sessionId)]);
    return res.redirect(`${clean}/index.html`);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    res.setHeader("Set-Cookie", clearStateCookie);
    return res.redirect(`${signInPage}?error=${encodeURIComponent("Something went wrong signing you in. Please try again.")}`);
  }
};