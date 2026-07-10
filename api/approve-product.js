/**
 * /api/approve-product.js
 * --------------------------
 * Admin-only. Publishes a pending WhatsApp-submitted product to the live
 * shop. Lets you correct the name/price/category/tag before it goes live,
 * since WhatsApp captions are easy to typo.
 *
 * Accepts: POST { id, name?, price?, cat?, tag?, was? }
 *   Header: x-admin-secret: <secret>
 * Returns: 200 { product }   - the newly published product
 *          404 { error }     - no such pending product
 *          401 { error }     - bad/missing secret
 *
 * REQUIRED ENV VARS: ADMIN_SECRET, KV_REST_API_URL / KV_REST_API_TOKEN
 */

const { approveProduct } = require("./_products");

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
    return sendJSON(res, 500, { error: "Admin endpoint is not configured." });
  }

  const providedSecret = req.headers["x-admin-secret"] || req.body?.secret;
  if (providedSecret !== adminSecret) {
    return sendJSON(res, 401, { error: "Unauthorized." });
  }

  const { id, name, price, cat, tag, was } = req.body || {};
  if (!id || typeof id !== "string") {
    return sendJSON(res, 400, { error: "Missing product id." });
  }

  let product;
  try {
    product = await approveProduct(id, { name, price, cat, tag, was });
  } catch (err) {
    console.error("KV error approving product:", err);
    return sendJSON(res, 500, { error: "Could not approve product." });
  }

  if (!product) {
    return sendJSON(res, 404, { error: "No pending product with that id." });
  }

  return sendJSON(res, 200, { product });
};