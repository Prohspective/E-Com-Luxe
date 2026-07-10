/**
 * /api/pending-products.js
 * --------------------------
 * Admin-only. Lists products submitted via WhatsApp that are awaiting
 * approval. Guarded the same way as all-orders.js / update-order-status.js.
 *
 * Accepts: GET /api/pending-products
 *   Header: x-admin-secret: <secret>   (preferred)
 *   or:     ?secret=<secret>
 *
 * Returns: 200 { products: [ { id, name, price, cat, tag, image,
 *                              receivedAt }, ... ] }  (newest first)
 *
 * REQUIRED ENV VARS: ADMIN_SECRET, KV_REST_API_URL / KV_REST_API_TOKEN
 */

const { getPendingProducts } = require("./_products");

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

  let products;
  try {
    products = await getPendingProducts();
  } catch (err) {
    console.error("KV read error in pending-products:", err);
    return sendJSON(res, 500, { error: "Could not load pending products." });
  }

  return sendJSON(res, 200, { products });
};