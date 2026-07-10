/**
 * /api/reject-product.js
 * -------------------------
 * Admin-only. Discards a pending WhatsApp-submitted product without
 * publishing it (e.g. a blurry photo, or a message that wasn't really a
 * product upload).
 *
 * Accepts: POST { id }
 *   Header: x-admin-secret: <secret>
 * Returns: 200 { ok: true }
 *          404 { error }  - no such pending product
 *          401 { error }  - bad/missing secret
 *
 * REQUIRED ENV VARS: ADMIN_SECRET, KV_REST_API_URL / KV_REST_API_TOKEN
 */

const { rejectProduct } = require("./_products");

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

  const { id } = req.body || {};
  if (!id || typeof id !== "string") {
    return sendJSON(res, 400, { error: "Missing product id." });
  }

  let removed;
  try {
    removed = await rejectProduct(id);
  } catch (err) {
    console.error("KV error rejecting product:", err);
    return sendJSON(res, 500, { error: "Could not reject product." });
  }

  if (!removed) {
    return sendJSON(res, 404, { error: "No pending product with that id." });
  }

  return sendJSON(res, 200, { ok: true });
};