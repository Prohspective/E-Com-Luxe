/**
 * /api/verify-order.js
 * ---------------------
 * Vercel serverless function.
 *
 * Accepts: GET  /api/verify-order?reference=xxxx
 *          POST { reference }
 * Returns: 200 { order: { reference, email, items, total, status, createdAt } }
 *          4xx/5xx { error: "message" } on failure
 *
 * Verifies the transaction directly with Paystack (never trusts the client's
 * word that a payment succeeded), then writes/refreshes the order record in
 * Vercel KV so it can be looked up later from success.html or track-order.html.
 *
 * REQUIRED ENV VARS:
 *   PAYSTACK_SECRET_KEY   - same key used by create-checkout-session.js
 *   KV_REST_API_URL / KV_REST_API_TOKEN - see api/_orders.js
 */

const CATALOG = require("../catalog");
const { saveOrder, getOrder } = require("./_orders");

const PAYSTACK_VERIFY_URL = "https://api.paystack.co/transaction/verify/";

function sendJSON(res, status, body) {
  res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return sendJSON(res, 405, { error: "Method not allowed. Use GET or POST." });
  }

  const reference =
    (req.method === "GET" ? req.query?.reference : req.body?.reference) ||
    req.query?.reference;

  if (!reference || typeof reference !== "string") {
    return sendJSON(res, 400, { error: "Missing transaction reference." });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.error("Missing PAYSTACK_SECRET_KEY environment variable.");
    return sendJSON(res, 500, {
      error: "Payment is not configured correctly. Please try again later.",
    });
  }

  // --- If we've already verified & stored this order, just return it -------
  try {
    const existing = await getOrder(reference);
    if (existing) {
      return sendJSON(res, 200, { order: existing });
    }
  } catch (err) {
    // KV might not be configured yet — fall through and still try to verify
    console.error("KV read error (continuing to verify with Paystack):", err);
  }

  // --- Verify with Paystack ---------------------------------------------------
  let paystackRes;
  try {
    paystackRes = await fetch(
      PAYSTACK_VERIFY_URL + encodeURIComponent(reference),
      {
        method: "GET",
        headers: { Authorization: `Bearer ${secretKey}` },
      }
    );
  } catch (err) {
    console.error("Network error calling Paystack verify:", err);
    return sendJSON(res, 502, {
      error: "Could not reach the payment provider. Please try again.",
    });
  }

  let data;
  try {
    data = await paystackRes.json();
  } catch (err) {
    console.error("Failed to parse Paystack verify response:", err);
    return sendJSON(res, 502, {
      error: "Unexpected response from the payment provider.",
    });
  }

  if (!paystackRes.ok || !data.status) {
    console.error("Paystack verify failed:", data);
    return sendJSON(res, 502, {
      error: data.message || "Could not verify this transaction.",
    });
  }

  const tx = data.data;
  if (!tx || tx.status !== "success") {
    return sendJSON(res, 200, {
      order: null,
      status: tx?.status || "unknown",
      error: "Payment was not successful.",
    });
  }

  const email = tx.customer?.email;
  if (!email) {
    console.error("Paystack transaction missing customer email:", tx);
    return sendJSON(res, 502, {
      error: "Payment provider did not return a customer email.",
    });
  }

  // --- Reconstruct line items from CATALOG using the amount Paystack charged.
  // Paystack itself doesn't store our cart shape, so we recover items from
  // Paystack's metadata if create-checkout-session.js sent it; otherwise we
  // fall back to a generic single line for the total amount charged.
  const metaItems = tx.metadata && Array.isArray(tx.metadata.items)
    ? tx.metadata.items
    : null;

  let items;
  if (metaItems) {
    items = metaItems.map((it) => ({
      id: it.id,
      qty: it.qty,
      price: CATALOG[it.id] ?? it.price ?? 0,
    }));
  } else {
    items = [{ id: null, qty: 1, price: tx.amount }];
  }

  const order = {
    reference,
    email,
    items,
    total: tx.amount,
    status: "Paid",
    createdAt: new Date(tx.paid_at || tx.created_at || Date.now()).toISOString(),
  };

  try {
    await saveOrder(order);
  } catch (err) {
    console.error("KV write error while saving order:", err);
    // Still return the verified order to the customer even if persistence
    // failed — payment succeeded and that's the priority.
    return sendJSON(res, 200, {
      order,
      warning: "Order verified but could not be saved for later lookup.",
    });
  }

  return sendJSON(res, 200, { order });
};