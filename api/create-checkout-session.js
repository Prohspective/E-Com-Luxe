/**
 * /api/create-checkout-session.js
 * --------------------------------
 * Vercel serverless function.
 *
 * Accepts: POST { cart: [{ id, qty }, ...], email }
 * Returns: 200 { url: "<paystack authorization_url>" }
 *          4xx/5xx { error: "message" } on any failure
 *
 * SECURITY: prices are NEVER trusted from the client. Every line item's
 * price is looked up server-side from CATALOG (catalog.js) and the total
 * is computed here before being sent to Paystack.
 *
 * REQUIRED ENV VARS:
 *   PAYSTACK_SECRET_KEY   - your Paystack secret key (sk_live_... / sk_test_...)
 *
 * OPTIONAL ENV VARS:
 *   PUBLIC_BASE_URL       - e.g. https://luxeenvogue.com
 *                           Used to build the Paystack callback_url
 *                           (…/success.html). If not set, falls back to
 *                           `https://${req.headers.host}`, which works fine
 *                           on Vercel but is easy to spoof via the Host
 *                           header, so setting this explicitly in
 *                           production is recommended.
 */

const CATALOG = require("../catalog");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAYSTACK_INIT_URL = "https://api.paystack.co/transaction/initialize";

function sendJSON(res, status, body) {
  res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJSON(res, 405, { error: "Method not allowed. Use POST." });
  }

  // --- Parse & validate body -------------------------------------------------
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return sendJSON(res, 400, { error: "Invalid JSON body." });
    }
  }
  body = body || {};

  const { cart, email, name, phone, address } = body;

  if (!Array.isArray(cart) || cart.length === 0) {
    return sendJSON(res, 400, { error: "Your bag is empty." });
  }

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return sendJSON(res, 400, { error: "Please enter a valid email address." });
  }

  if (typeof name !== "string" || !name.trim()) {
    return sendJSON(res, 400, { error: "Please enter your full name." });
  }

  if (typeof phone !== "string" || !phone.trim()) {
    return sendJSON(res, 400, { error: "Please enter a phone number." });
  }

  if (typeof address !== "string" || !address.trim()) {
    return sendJSON(res, 400, { error: "Please enter your delivery address." });
  }

  // --- Recompute total server-side from CATALOG (never trust client price) --
  let total = 0;
  for (const item of cart) {
    if (!item || typeof item !== "object") {
      return sendJSON(res, 400, { error: "Invalid item in cart." });
    }

    const { id, qty } = item;
    const price = CATALOG[id];

    if (price === undefined) {
      return sendJSON(res, 400, { error: `Unknown product: ${id}` });
    }

    const quantity = Number(qty);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return sendJSON(res, 400, { error: `Invalid quantity for product: ${id}` });
    }

    total += price * quantity;
  }

  if (total <= 0) {
    return sendJSON(res, 400, { error: "Cart total must be greater than zero." });
  }

  // --- Check server config ----------------------------------------------------
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.error("Missing PAYSTACK_SECRET_KEY environment variable.");
    return sendJSON(res, 500, {
      error: "Payment is not configured correctly. Please try again later.",
    });
  }

  // --- Build callback URL ------------------------------------------------------
  const baseUrl =
    process.env.PUBLIC_BASE_URL || `https://${req.headers.host}`;
  const callbackUrl = `${baseUrl.replace(/\/$/, "")}/success.html`;

  // --- Call Paystack Initialize Transaction -----------------------------------
  let paystackRes;
  try {
    paystackRes = await fetch(PAYSTACK_INIT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim(),
        amount: total, // kobo
        callback_url: callbackUrl,
        metadata: {
          // Stashed so /api/verify-order.js can reconstruct line items
          // after payment without trusting anything from the client at
          // that point — only the reference is passed back by Paystack.
          items: cart.map((item) => ({ id: item.id, qty: Number(item.qty) })),
          shipping: {
            name: name.trim(),
            phone: phone.trim(),
            address: address.trim(),
          },
        },
      }),
    });
  } catch (err) {
    console.error("Network error calling Paystack:", err);
    return sendJSON(res, 502, {
      error: "Could not reach the payment provider. Please try again.",
    });
  }

  let data;
  try {
    data = await paystackRes.json();
  } catch (err) {
    console.error("Failed to parse Paystack response:", err);
    return sendJSON(res, 502, {
      error: "Unexpected response from the payment provider.",
    });
  }

  if (!paystackRes.ok || !data.status) {
    console.error("Paystack initialize failed:", data);
    return sendJSON(res, 502, {
      error: data.message || "Failed to start checkout. Please try again.",
    });
  }

  const authorizationUrl = data.data && data.data.authorization_url;
  if (!authorizationUrl) {
    console.error("Paystack response missing authorization_url:", data);
    return sendJSON(res, 502, {
      error: "Payment provider did not return a checkout link.",
    });
  }

  return sendJSON(res, 200, { url: authorizationUrl });
};