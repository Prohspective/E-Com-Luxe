/**
 * /api/update-order-status.js
 * ------------------------------
 * Vercel serverless function. NICE-TO-HAVE / internal tool, not linked from
 * any customer-facing page.
 *
 * Lets you move an order through Paid -> Processing -> Shipped -> Delivered
 * without editing KV by hand. Guarded by a shared secret so randoms can't
 * hit it — this is NOT a real admin auth system, just a stopgap.
 *
 * Accepts: POST { reference, status, secret }
 *   Header alternative: x-admin-secret: <secret>  (instead of body.secret)
 * Returns: 200 { order }
 *          401 { error }  - bad/missing secret
 *          404 { error }  - no such order
 *          400 { error }  - bad status value
 *
 * REQUIRED ENV VARS:
 *   ADMIN_SECRET          - any long random string you choose
 *   KV_REST_API_URL / KV_REST_API_TOKEN - see api/_orders.js
 *
 * Example:
 *   curl -X POST https://yoursite.com/api/update-order-status \
 *     -H "Content-Type: application/json" \
 *     -H "x-admin-secret: $ADMIN_SECRET" \
 *     -d '{"reference":"abc123","status":"Shipped"}'
 */

const { updateOrderStatus, STATUSES } = require("./_orders");

function sendJSON(res, status, body) {
  res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJSON(res, 405, { error: "Method not allowed. Use POST." });
  }

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    console.error("Missing ADMIN_SECRET environment variable.");
    return sendJSON(res, 500, {
      error: "Admin endpoint is not configured.",
    });
  }

  const providedSecret = req.headers["x-admin-secret"] || req.body?.secret;
  if (providedSecret !== adminSecret) {
    return sendJSON(res, 401, { error: "Unauthorized." });
  }

  const { reference, status } = req.body || {};

  if (!reference || typeof reference !== "string") {
    return sendJSON(res, 400, { error: "Missing order reference." });
  }
  if (!STATUSES.includes(status)) {
    return sendJSON(res, 400, {
      error: `Invalid status. Must be one of: ${STATUSES.join(", ")}`,
    });
  }

  let order;
  try {
    order = await updateOrderStatus(reference, status);
  } catch (err) {
    console.error("KV error updating order status:", err);
    return sendJSON(res, 500, { error: "Could not update order status." });
  }

  if (!order) {
    return sendJSON(res, 404, { error: "No order found with that reference." });
  }

  return sendJSON(res, 200, { order });
};