// /api/create-checkout-session.js
//
// Runs SERVER-SIDE on Vercel — safe place for your Paystack Secret Key.
// Receives the cart from the browser as [{ id, qty }, ...] (matching the
// Cart object's format in script.js), re-validates prices against
// catalog.js (never trust prices sent from the browser), and initializes
// a Paystack transaction.

const CATALOG = require("../catalog.js");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { cart, email } = req.body;

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: "Cart is empty." });
    }
    if (!email) {
      return res.status(400).json({ error: "Email is required for checkout." });
    }

    // Recompute the total SERVER-SIDE from catalog.js.
    let totalNaira = 0;
    for (const item of cart) {
      const price = CATALOG[item.id];
      if (price === undefined) {
        throw new Error(`Unknown product: ${item.id}`);
      }
      const qty = item.qty || 1;
      totalNaira += price * qty;
    }

    // Paystack amounts are in kobo (1 Naira = 100 kobo).
    const amountKobo = Math.round(totalNaira * 100);

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        amount: amountKobo,
        currency: "NGN",
        callback_url: "https://e-com-luxe.vercel.app/success.html"
      })
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || "Paystack initialization failed.");
    }

    return res.status(200).json({ url: data.data.authorization_url });
  } catch (err) {
    console.error("Checkout session error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
};