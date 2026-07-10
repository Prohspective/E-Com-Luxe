/**
 * /api/products.js
 * ------------------
 * Public endpoint. Returns products that were added via WhatsApp and
 * approved in the admin dashboard. script.js fetches this on page load and
 * appends the results to the built-in PRODUCTS array — the original 38
 * products in script.js are untouched and always render, WhatsApp/approved
 * items just layer on top.
 *
 * Accepts: GET /api/products
 * Returns: 200 { products: [ { id, name, cat, price, was, tag, image }, ... ] }
 *
 * REQUIRED ENV VARS: KV_REST_API_URL / KV_REST_API_TOKEN (see api/_orders.js)
 */

const { getApprovedProducts } = require("./_products");

function sendJSON(res, status, body) {
  res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJSON(res, 405, { error: "Method not allowed. Use GET." });
  }

  let products;
  try {
    products = await getApprovedProducts();
  } catch (err) {
    console.error("KV read error in products:", err);
    // Fail soft — the static catalogue still works even if this errors.
    return sendJSON(res, 200, { products: [] });
  }

  return sendJSON(res, 200, { products });
};