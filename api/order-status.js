/**
 * /api/order-status.js
 * ----------------------
 * Vercel serverless function.
 *
 * Accepts (GET query string or POST JSON body):
 *   { email }                 -> all orders for that email
 *   { email, reference }      -> just that one order (still checked against
 *                                 the email, so one customer can't look up
 *                                 another's order by guessing a reference)
 *
 * Returns: 200 { orders: [ { reference, email, items, total, status,
 *                            createdAt, updatedAt } , ... ] }
 *          404 { error: "..." } if nothing matches
 *          4xx { error: "..." } on bad input
 *
 * REQUIRED ENV VARS: KV_REST_API_URL / KV_REST_API_TOKEN (see api/_orders.js)
 */

const { getOrdersByEmail, normalizeEmail } = require("./_orders");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sendJSON(res, status, body) {
  res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return sendJSON(res, 405, { error: "Method not allowed. Use GET or POST." });
  }

  const source = req.method === "GET" ? req.query : req.body || {};
  const email = source?.email;
  const reference = source?.reference;

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return sendJSON(res, 400, { error: "Please enter a valid email address." });
  }

  let orders;
  try {
    orders = await getOrdersByEmail(email);
  } catch (err) {
    console.error("KV read error in order-status:", err);
    return sendJSON(res, 500, { error: "Could not look up orders right now." });
  }

  if (reference) {
    orders = orders.filter((o) => o.reference === reference);
  }

  if (orders.length === 0) {
    return sendJSON(res, 404, {
      error: reference
        ? "No order found with that email and reference."
        : "No orders found for that email address.",
    });
  }

  return sendJSON(res, 200, { orders });
};