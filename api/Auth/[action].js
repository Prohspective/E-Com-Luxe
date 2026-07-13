/**
 * /api/auth/[action].js
 * -----------------------
 * Single consolidated auth endpoint (Vercel dynamic route). Sign Up,
 * Sign In, Sign Out, session check, and both Google OAuth steps all
 * live in this ONE file so they count as a single Serverless Function
 * — this project is on Vercel's Hobby plan, which caps a deployment
 * at 12 functions, and six separate auth-*.js files pushed it over.
 *
 * Routes (all under /api/auth/<action>):
 *   POST /api/auth/signup           { name, email, password }
 *   POST /api/auth/login            { email, password }
 *   POST /api/auth/logout
 *   GET  /api/auth/session
 *   GET  /api/auth/google
 *   GET  /api/auth/google-callback
 *
 * REQUIRED ENV VARS (Google steps only):
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *
 * NOTE: register this exact redirect URI in Google Cloud Console:
 *   https://yourdomain.com/api/auth/google-callback
 */

const crypto = require("crypto");
const {
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
} = require("../_users");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BAD_CREDENTIALS = "Incorrect email or password.";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

function sendJSON(res, status, body) {
  res.status(status).json(body);
}

function parseBody(req) {
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body || {};
}

/* ---------------- Email + password ---------------- */

async function handleSignup(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJSON(res, 405, { error: "Method not allowed. Use POST." });
  }
  const body = parseBody(req);
  if (body === null) return sendJSON(res, 400, { error: "Invalid JSON body." });
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
    const user = await createUser({ name: name.trim(), email, passwordHash: hash, passwordSalt: salt });
    const sessionId = await createSession(user);
    res.setHeader("Set-Cookie", sessionCookie(sessionId));
    return sendJSON(res, 200, { user: publicUser(user) });
  } catch (err) {
    console.error("Signup failed:", err);
    return sendJSON(res, 500, { error: "Could not create your account. Please try again." });
  }
}

async function handleLogin(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJSON(res, 405, { error: "Method not allowed. Use POST." });
  }
  const body = parseBody(req);
  if (body === null) return sendJSON(res, 400, { error: "Invalid JSON body." });
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
      return sendJSON(res, 401, { error: BAD_CREDENTIALS });
    }
    const ok = verifyPassword(password, user.passwordSalt, user.passwordHash);
    if (!ok) return sendJSON(res, 401, { error: BAD_CREDENTIALS });

    const sessionId = await createSession(user);
    res.setHeader("Set-Cookie", sessionCookie(sessionId));
    return sendJSON(res, 200, { user: publicUser(user) });
  } catch (err) {
    console.error("Login failed:", err);
    return sendJSON(res, 500, { error: "Could not sign you in. Please try again." });
  }
}

async function handleLogout(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJSON(res, 405, { error: "Method not allowed. Use POST." });
  }
  try {
    const sessionId = req.cookies && req.cookies.lev_session;
    await destroySession(sessionId);
  } catch (err) {
    console.error("Logout failed:", err);
  }
  res.setHeader("Set-Cookie", sessionCookie(null, { clear: true }));
  return sendJSON(res, 200, { ok: true });
}

async function handleSession(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJSON(res, 405, { error: "Method not allowed. Use GET." });
  }
  try {
    const sessionId = req.cookies && req.cookies.lev_session;
    const session = await getSession(sessionId);
    if (!session) return sendJSON(res, 200, { user: null });
    return sendJSON(res, 200, {
      user: { id: session.userId, name: session.name, email: session.email },
    });
  } catch (err) {
    console.error("Session check failed:", err);
    return sendJSON(res, 200, { user: null });
  }
}

/* ---------------- Google OAuth ---------------- */

async function handleGoogleStart(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error("Missing GOOGLE_CLIENT_ID environment variable.");
    return sendJSON(res, 500, { error: "Google sign-in is not configured." });
  }

  const baseUrl = process.env.PUBLIC_BASE_URL || `https://${req.headers.host}`;
  const redirectUri = `${baseUrl.replace(/\/$/, "")}/api/auth/google-callback`;
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
}

async function handleGoogleCallback(req, res) {
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
    const redirectUri = `${clean}/api/auth/google-callback`;

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
}

/* ---------------- Dispatch ---------------- */

module.exports = async function handler(req, res) {
  const { action } = req.query;

  switch (action) {
    case "signup":
      return handleSignup(req, res);
    case "login":
      return handleLogin(req, res);
    case "logout":
      return handleLogout(req, res);
    case "session":
      return handleSession(req, res);
    case "google":
      return handleGoogleStart(req, res);
    case "google-callback":
      return handleGoogleCallback(req, res);
    default:
      return sendJSON(res, 404, { error: "Unknown auth action." });
  }
};