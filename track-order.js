/**
 * track-order.js
 * ----------------
 * Powers track-order.html. Relies on `nairaFormat` and `PRODUCTS` from
 * script.js (loaded first) and `showToast` for error toasts.
 */

const STATUS_STEPS = ["Paid", "Processing", "Shipped", "Delivered"];

function productName(id) {
  const p = PRODUCTS.find((p) => p.id === id);
  return p ? p.name : "Item";
}

function renderStatusTimeline(status) {
  const currentIndex = STATUS_STEPS.indexOf(status);
  return `
    <div class="status-timeline">
      ${STATUS_STEPS.map((step, i) => {
        const state =
          i < currentIndex ? "done" : i === currentIndex ? "current" : "";
        return `
        <div class="status-step ${state}">
          <span class="status-dot"></span>
          <span class="status-label">${step}</span>
        </div>`;
      }).join("")}
    </div>`;
}

function renderOrderCard(order) {
  const date = new Date(order.createdAt).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const itemsHtml = (order.items || [])
    .map((it) => {
      const name = it.id ? productName(it.id) : "Order item";
      const lineTotal = (it.price || 0) * (it.qty || 1);
      return `
      <div class="track-item-row">
        <span>${name} ${it.qty > 1 ? `× ${it.qty}` : ""}</span>
        <span>${nairaFormat(lineTotal)}</span>
      </div>`;
    })
    .join("");

  const shipping = order.shipping;
  const shippingHtml = shipping
    ? `<div class="track-shipping">
        <div class="track-shipping-label">Shipping to</div>
        <strong>${shipping.name || ""}</strong><br/>
        ${shipping.phone || ""}<br/>
        ${(shipping.address || "").replace(/\n/g, "<br/>")}
      </div>`
    : "";

  return `
  <div class="track-order-card reveal is-visible">
    <div class="track-order-head">
      <div>
        <div class="track-order-ref">Order ${order.reference}</div>
        <div class="track-order-date">${date}</div>
      </div>
      <span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span>
    </div>
    ${renderStatusTimeline(order.status)}
    <div class="track-items">${itemsHtml}</div>
    <div class="track-order-total">
      <span>Total</span><strong>${nairaFormat(order.total)}</strong>
    </div>
    ${shippingHtml}
  </div>`;
}

async function trackOrder(email, reference) {
  const resultsEl = document.querySelector("[data-track-results]");
  const errorEl = document.querySelector("[data-track-error]");
  const submitBtn = document.querySelector("[data-track-submit]");

  if (errorEl) errorEl.textContent = "";
  if (resultsEl) resultsEl.innerHTML = "";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Searching…";
  }

  try {
    const params = new URLSearchParams({ email });
    if (reference) params.set("reference", reference);

    const response = await fetch(`/api/order-status?${params.toString()}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Could not find that order.");
    }

    const orders = data.orders || [];
    if (resultsEl) {
      resultsEl.innerHTML = orders.map(renderOrderCard).join("");
    }
  } catch (err) {
    if (errorEl) errorEl.textContent = err.message || "Something went wrong.";
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Track order";
    }
  }
}

function initTrackOrderForm() {
  const form = document.querySelector("[data-track-form]");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.querySelector("[data-track-email]")?.value.trim();
    const reference = document
      .querySelector("[data-track-reference]")
      ?.value.trim();

    const errorEl = document.querySelector("[data-track-error]");
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !EMAIL_RE.test(email)) {
      if (errorEl) errorEl.textContent = "Please enter a valid email address.";
      return;
    }

    trackOrder(email, reference);
  });

  // Prefill from ?email=&reference= query params (e.g. linked from success.html)
  const qs = new URLSearchParams(window.location.search);
  const qEmail = qs.get("email");
  const qReference = qs.get("reference");
  if (qEmail) {
    const emailInput = document.querySelector("[data-track-email]");
    const refInput = document.querySelector("[data-track-reference]");
    if (emailInput) emailInput.value = qEmail;
    if (refInput && qReference) refInput.value = qReference;
    if (qEmail) trackOrder(qEmail, qReference || "");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await window.__productsReady;
  initTrackOrderForm();
});