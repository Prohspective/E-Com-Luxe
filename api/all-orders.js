/**
 * /api/all-orders.js
 * --------------------
 * Vercel serverless function. Admin-only endpoint that lists EVERY order
 * ever placed — used by admin.html so you (the store owner) can see what
 * needs to be packed/shipped without knowing each customer's email.
 *
 * Guarded the same way as update-order-status.js: a shared secret, either
 * as a header (x-admin-secret) or a query param (?secret=...).
 *
 * Accepts: GET /api/all-orders
 *   Header: x-admin-secret: <secret>   (preferred)
 *   or:     ?secret=<secret>           (fallback, used by admin.html)
 *
 * Returns: 200 { orders: [ { reference, email, items, total, status,
 *                            createdAt, updatedAt }, ... ] }   (newest first)
 *          401 { error }  - bad/missing secret
 *          500 { error }  - ADMIN_SECRET not configured, or KV read error
 *
 * REQUIRED ENV VARS:
 *   ADMIN_SECRET                          - same value used by update-order-status.js
 *   KV_REST_API_URL / KV_REST_API_TOKEN   - see api/_orders.js
 */

const { getAllOrders } = require("./_orders");

function sendJSON(res, status, body) {
  res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJSON(res, 405, { error: "Method not allowed. Use GET." });
  }

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    console.error("Missing ADMIN_SECRET environment variable.");
    return sendJSON(res, 500, { error: "Admin endpoint is not configured." });
  }

  const providedSecret = req.headers["x-admin-secret"] || req.query?.secret;
  if (providedSecret !== adminSecret) {
    return sendJSON(res, 401, { error: "Unauthorized." });
  }

  let orders;
  try {
    orders = await getAllOrders();
  } catch (err) {
    console.error("KV read error in all-orders:", err);
    return sendJSON(res, 500, { error: "Could not load orders right now." });
  }

  return sendJSON(res, 200, { orders });
};