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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function openCheckoutModal(){
  const modal = document.querySelector('[data-checkout-modal]');
  if(!modal) return;
  modal.classList.add('is-open');
  const input = modal.querySelector('[data-checkout-email]');
  const error = modal.querySelector('[data-checkout-error]');
  if(error) error.textContent = '';
  if(input){
    input.value = '';
    setTimeout(() => input.focus(), 50);
  }
}

function closeCheckoutModal(){
  document.querySelector('[data-checkout-modal]')?.classList.remove('is-open');
}

async function submitCheckout(email){
  const items = Cart.read(); // [{ id, qty }, ...] — from your existing Cart object
  const modal = document.querySelector('[data-checkout-modal]');
  const submitBtn = modal?.querySelector('[data-checkout-submit]');

  if(submitBtn){
    submitBtn.disabled = true;
    submitBtn.textContent = 'Redirecting…';
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
    if(submitBtn){
      submitBtn.disabled = false;
      submitBtn.textContent = "Continue";
    }
  }
}

function initCheckoutModal(){
  const modal = document.querySelector('[data-checkout-modal]');
  if(!modal) return;

  const form = modal.querySelector('[data-checkout-form]');
  const input = modal.querySelector('[data-checkout-email]');
  const error = modal.querySelector('[data-checkout-error]');
  const cancelBtn = modal.querySelector('[data-checkout-cancel]');

  // Every "Checkout" button in the cart drawer (there's one per page)
  document.querySelectorAll('[data-checkout-btn]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if(Cart.read().length === 0){
        showToast("Your bag is empty");
        return;
      }
      openCheckoutModal();
    });
  });

  cancelBtn?.addEventListener('click', closeCheckoutModal);
  modal.addEventListener('click', (e) => {
    if(e.target === modal) closeCheckoutModal();
  });
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && modal.classList.contains('is-open')) closeCheckoutModal();
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = input?.value.trim() || '';
    if(!EMAIL_RE.test(email)){
      if(error) error.textContent = 'Please enter a valid email address.';
      input?.focus();
      return;
    }
    if(error) error.textContent = '';
    submitCheckout(email);
  });
}

document.addEventListener("DOMContentLoaded", initCheckoutModal);