/**
 * checkout.js
 * -----------
 * Load this AFTER script.js:
 *   <script src="script.js"></script>
 *   <script src="checkout.js"></script>
 *
 * It uses the existing `Cart` object and `PRODUCTS` array that script.js
 * already defines — it does NOT redeclare them, so there's no conflict.
 */

async function startCheckout() {
  const items = Cart.read(); // [{ id, qty }, ...] — from your existing Cart object

  if (items.length === 0) {
    showToast("Your bag is empty");
    return;
  }

  const email = window.prompt("Enter your email for your receipt:");
  if (!email) return; // user cancelled

  const checkoutBtn = document.querySelector("[data-checkout-btn]");
  if (checkoutBtn) {
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Redirecting to checkout...";
  }

  try {
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart: items, email })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Checkout failed. Please try again.");
    }

    const data = await response.json();
    if (data.url) {
      window.location.href = data.url; // redirect to Paystack's hosted page
    } else {
      throw new Error("No checkout URL returned.");
    }
  } catch (err) {
    showToast(err.message || "Something went wrong. Please try again.");
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Checkout";
    }
  }
}

// Wire up every "Checkout" button in the cart drawer (there's one per page)
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-checkout-btn]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      startCheckout();
    });
  });
});