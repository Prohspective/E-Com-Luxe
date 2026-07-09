/**
 * admin.js
 * ---------
 * Powers admin.html. Standalone — does not depend on script.js.
 *
 * Flow:
 *   1. Owner enters the ADMIN_SECRET (same value set as the ADMIN_SECRET
 *      env var on Vercel). It's kept in sessionStorage only (cleared when
 *      the browser tab closes) and sent as the `x-admin-secret` header on
 *      every request — it is NEVER written into the page or a public file.
 *   2. GET /api/all-orders lists every order ever placed.
 *   3. Each order has a status <select>; changing it calls
 *      POST /api/update-order-status, which updates Vercel KV. The buyer
 *      then sees the new status next time they visit track-order.html,
 *      since that page reads the same KV record.
 *
 * NOTE: this is a lightweight shared-secret gate, not a real auth system —
 * good enough for a solo-owner store, but don't treat it as bulletproof.
 */

const SECRET_KEY = "lev_admin_secret_v1"; // sessionStorage key (per-tab only)
let ORDERS = [];

function nairaFormat(n) {
  return "₦" + Number(n || 0).toLocaleString("en-NG");
}

function showToast(msg) {
  const toast = document.querySelector("[data-toast]");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("is-on");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("is-on"), 3000);
}

function getSecret() {
  return sessionStorage.getItem(SECRET_KEY) || "";
}

function setSecret(secret) {
  sessionStorage.setItem(SECRET_KEY, secret);
}

function clearSecret() {
  sessionStorage.removeItem(SECRET_KEY);
}

function showDashboard() {
  document.querySelector("[data-admin-login]")?.classList.add("admin-hidden");
  document.querySelector("[data-admin-dashboard]")?.classList.remove("admin-hidden");
}

function showLogin() {
  document.querySelector("[data-admin-dashboard]")?.classList.add("admin-hidden");
  document.querySelector("[data-admin-login]")?.classList.remove("admin-hidden");
}

async function fetchOrders() {
  const secret = getSecret();
  const countEl = document.querySelector("[data-admin-count]");
  if (countEl) countEl.textContent = "Loading…";

  try {
    const res = await fetch("/api/all-orders", {
      headers: { "x-admin-secret": secret },
    });

    if (res.status === 401) {
      showToast("Incorrect admin secret.");
      clearSecret();
      showLogin();
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Could not load orders.");
    }

    ORDERS = data.orders || [];
    renderOrders();
  } catch (err) {
    if (countEl) countEl.textContent = "";
    showToast(err.message || "Could not load orders.");
  }
}

function renderOrders() {
  const listEl = document.querySelector("[data-admin-orders]");
  const countEl = document.querySelector("[data-admin-count]");
  const search = (document.querySelector("[data-admin-search]")?.value || "")
    .trim()
    .toLowerCase();
  const statusFilter = document.querySelector("[data-admin-filter]")?.value || "";

  let visible = ORDERS;

  if (statusFilter) {
    visible = visible.filter((o) => o.status === statusFilter);
  }
  if (search) {
    visible = visible.filter(
      (o) =>
        o.email?.toLowerCase().includes(search) ||
        o.reference?.toLowerCase().includes(search) ||
        o.shipping?.name?.toLowerCase().includes(search) ||
        o.shipping?.phone?.toLowerCase().includes(search) ||
        o.shipping?.address?.toLowerCase().includes(search)
    );
  }

  if (countEl) {
    countEl.textContent = `${visible.length} of ${ORDERS.length} order${
      ORDERS.length === 1 ? "" : "s"
    }`;
  }

  if (!listEl) return;

  if (visible.length === 0) {
    listEl.innerHTML = `<div class="admin-empty">No orders match.</div>`;
    return;
  }

  listEl.innerHTML = visible.map(renderOrderCard).join("");

  listEl.querySelectorAll("[data-status-select]").forEach((select) => {
    select.addEventListener("change", (e) => {
      const reference = e.target.getAttribute("data-status-select");
      updateStatus(reference, e.target.value, e.target);
    });
  });
}

function renderOrderCard(order) {
  const date = order.createdAt
    ? new Date(order.createdAt).toLocaleString("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const itemsHtml = (order.items || [])
    .map((it) => {
      const label = it.id || "Item";
      const lineTotal = (it.price || 0) * (it.qty || 1);
      return `<div class="order-item-row">
        <span>${label}${it.qty > 1 ? " × " + it.qty : ""}</span>
        <span>${nairaFormat(lineTotal)}</span>
      </div>`;
    })
    .join("");

  const statuses = ["Paid", "Processing", "Shipped", "Delivered"];
  const optionsHtml = statuses
    .map(
      (s) =>
        `<option value="${s}" ${s === order.status ? "selected" : ""}>${s}</option>`
    )
    .join("");

  const shipping = order.shipping;
  const shippingHtml = shipping
    ? `<div class="order-shipping">
        <strong>${shipping.name || "—"}</strong><br/>
        ${shipping.phone || "—"}<br/>
        ${(shipping.address || "—").replace(/\n/g, "<br/>")}
      </div>`
    : `<div class="order-shipping order-shipping-missing">No delivery address on file for this order.</div>`;

  return `
  <div class="order-card">
    <div class="order-card-head">
      <div>
        <div class="order-ref">${order.reference}</div>
        <div class="order-email">${order.email}</div>
        <div class="order-date">${date}</div>
      </div>
      <span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span>
    </div>
    <div class="order-items">${itemsHtml}</div>
    <div class="order-total-row"><span>Total</span><span>${nairaFormat(order.total)}</span></div>
    <div class="order-section-label">Ship to</div>
    ${shippingHtml}
    <div class="order-controls">
      <label style="font-size:.8rem;color:var(--royal)">Update status:</label>
      <select data-status-select="${order.reference}">${optionsHtml}</select>
    </div>
  </div>`;
}

async function updateStatus(reference, status, selectEl) {
  const secret = getSecret();
  selectEl.disabled = true;

  try {
    const res = await fetch("/api/update-order-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret,
      },
      body: JSON.stringify({ reference, status }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Could not update status.");
    }

    // Update local copy so filtering/badges reflect the change immediately
    const idx = ORDERS.findIndex((o) => o.reference === reference);
    if (idx !== -1) ORDERS[idx] = data.order;
    renderOrders();
    showToast(`Order ${reference} marked ${status}.`);
  } catch (err) {
    showToast(err.message || "Could not update status.");
  } finally {
    selectEl.disabled = false;
  }
}

function initLogin() {
  const btn = document.querySelector("[data-admin-login-btn]");
  const input = document.querySelector("[data-admin-secret-input]");
  const error = document.querySelector("[data-admin-login-error]");

  const attempt = async () => {
    const val = input?.value.trim();
    if (!val) {
      if (error) error.textContent = "Enter your admin secret.";
      return;
    }
    setSecret(val);
    if (error) error.textContent = "";
    showDashboard();
    await fetchOrders();
  };

  btn?.addEventListener("click", attempt);
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") attempt();
  });
}

function initToolbar() {
  document
    .querySelector("[data-admin-search]")
    ?.addEventListener("input", renderOrders);
  document
    .querySelector("[data-admin-filter]")
    ?.addEventListener("change", renderOrders);
  document
    .querySelector("[data-admin-refresh]")
    ?.addEventListener("click", fetchOrders);
  document.querySelector("[data-admin-logout]")?.addEventListener("click", () => {
    clearSecret();
    showLogin();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initLogin();
  initToolbar();

  // If a secret is already stored for this tab, skip straight to the dashboard.
  if (getSecret()) {
    showDashboard();
    fetchOrders();
  }
});