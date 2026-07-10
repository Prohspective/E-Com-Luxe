/**
 * /api/_products.js — shared product storage helper (Vercel KV / Upstash Redis).
 * ---------------------------------------------------------------------------
 * Used by whatsapp-webhook.js, pending-products.js, approve-product.js,
 * reject-product.js, and products.js. Not itself an API route.
 *
 * These are ADDITIONAL products layered on top of the 38 built-in products
 * that already live in script.js / catalog.js. Nothing here touches those —
 * the static catalogue is untouched and always renders first. Anything
 * approved here just gets appended to it in the browser.
 *
 * KV KEY SHAPE:
 *   pending_products   -> JSON array of pending product objects, each:
 *     { id, name, price, cat, tag, image, waMessageId, receivedAt }
 *   approved_products   -> JSON array of live product objects, same shape
 *                          as entries in script.js's PRODUCTS array:
 *     { id, name, cat, price, was, tag, image }
 *
 * REQUIRED ENV VARS: KV_REST_API_URL / KV_REST_API_TOKEN (see api/_orders.js)
 */

const { kv } = require("@vercel/kv");

const PENDING_KEY = "pending_products";
const APPROVED_KEY = "approved_products";

async function readList(key) {
  const raw = await kv.get(key);
  if (!raw) return [];
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

async function writeList(key, list) {
  await kv.set(key, JSON.stringify(list));
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function getPendingProducts() {
  const list = await readList(PENDING_KEY);
  return list.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
}

async function addPendingProduct({ name, price, cat, tag, image, waMessageId }) {
  const list = await readList(PENDING_KEY);
  const product = {
    id: makeId("pend"),
    name: name || "Untitled item",
    price: Number(price) || 0,
    cat: cat || "Uncategorized",
    tag: tag || null,
    image: image || null,
    waMessageId: waMessageId || null,
    receivedAt: new Date().toISOString(),
  };
  list.push(product);
  await writeList(PENDING_KEY, list);
  return product;
}

async function removePendingProduct(id) {
  const list = await readList(PENDING_KEY);
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const [removed] = list.splice(idx, 1);
  await writeList(PENDING_KEY, list);
  return removed;
}

async function getApprovedProducts() {
  return readList(APPROVED_KEY);
}

/**
 * Moves a pending product into the live/approved list, optionally applying
 * edits made by the admin at approval time (name/price/cat/tag/image).
 * The final product id is a fresh "shop" id (distinct from the pending id)
 * so it slots into the same id-space checkout already understands.
 */
async function approveProduct(pendingId, edits = {}) {
  const pending = await removePendingProduct(pendingId);
  if (!pending) return null;

  const approvedList = await readList(APPROVED_KEY);
  const product = {
    id: makeId("wa"),
    name: edits.name ?? pending.name,
    cat: edits.cat ?? pending.cat,
    price: Number(edits.price ?? pending.price) || 0,
    was: edits.was ? Number(edits.was) : null,
    tag: edits.tag ?? pending.tag,
    image: edits.image ?? pending.image,
  };
  approvedList.push(product);
  await writeList(APPROVED_KEY, approvedList);
  return product;
}

async function rejectProduct(pendingId) {
  return removePendingProduct(pendingId);
}

module.exports = {
  getPendingProducts,
  addPendingProduct,
  removePendingProduct,
  getApprovedProducts,
  approveProduct,
  rejectProduct,
};