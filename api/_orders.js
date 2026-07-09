/**
 * /api/_orders.js — shared order storage helper (Vercel KV / Upstash Redis).
 * ---------------------------------------------------------------------------
 * Used by verify-order.js, order-status.js, and update-order-status.js.
 * Not itself an API route (leading underscore keeps Vercel from routing to it).
 *
 * KV KEY SHAPE:
 *   order:<reference>          -> JSON string of the order object
 *   orders_by_email:<email>     -> JSON string array of reference strings
 *   all_orders                  -> JSON string array of every reference string
 *                                   (used by the admin dashboard to list all
 *                                   orders without needing a customer's email)
 *
 * REQUIRED ENV VARS (auto-set by Vercel once a KV store is attached to the
 * project — Storage tab -> Create Database -> KV -> Connect Project):
 *   KV_REST_API_URL
 *   KV_REST_API_TOKEN
 * (also fine if KV_URL / KV_REST_API_READ_ONLY_TOKEN etc. are present —
 * @vercel/kv only needs the two above to function.)
 */

const { kv } = require("@vercel/kv");

const STATUSES = ["Paid", "Processing", "Shipped", "Delivered"];

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function orderKey(reference) {
  return `order:${reference}`;
}

function emailIndexKey(email) {
  return `orders_by_email:${normalizeEmail(email)}`;
}

const ALL_ORDERS_KEY = "all_orders";

async function getOrder(reference) {
  if (!reference) return null;
  const data = await kv.get(orderKey(reference));
  if (!data) return null;
  return typeof data === "string" ? JSON.parse(data) : data;
}

async function saveOrder(order) {
  await kv.set(orderKey(order.reference), JSON.stringify(order));

  const idxKey = emailIndexKey(order.email);
  const existingRaw = await kv.get(idxKey);
  const existing = existingRaw
    ? (typeof existingRaw === "string" ? JSON.parse(existingRaw) : existingRaw)
    : [];

  if (!existing.includes(order.reference)) {
    existing.push(order.reference);
    await kv.set(idxKey, JSON.stringify(existing));
  }

  // Also keep a global index of every order reference, so the admin
  // dashboard can list all orders without knowing customer emails.
  const allRaw = await kv.get(ALL_ORDERS_KEY);
  const allRefs = allRaw
    ? (typeof allRaw === "string" ? JSON.parse(allRaw) : allRaw)
    : [];

  if (!allRefs.includes(order.reference)) {
    allRefs.push(order.reference);
    await kv.set(ALL_ORDERS_KEY, JSON.stringify(allRefs));
  }

  return order;
}

async function getOrdersByEmail(email) {
  const idxKey = emailIndexKey(email);
  const raw = await kv.get(idxKey);
  const references = raw
    ? (typeof raw === "string" ? JSON.parse(raw) : raw)
    : [];

  const orders = await Promise.all(references.map((ref) => getOrder(ref)));
  return orders.filter(Boolean).sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

async function getAllOrders() {
  const raw = await kv.get(ALL_ORDERS_KEY);
  const references = raw
    ? (typeof raw === "string" ? JSON.parse(raw) : raw)
    : [];

  const orders = await Promise.all(references.map((ref) => getOrder(ref)));
  return orders.filter(Boolean).sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

async function updateOrderStatus(reference, status) {
  if (!STATUSES.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  const order = await getOrder(reference);
  if (!order) return null;
  order.status = status;
  order.updatedAt = new Date().toISOString();
  await saveOrder(order);
  return order;
}

module.exports = {
  STATUSES,
  normalizeEmail,
  getOrder,
  saveOrder,
  getOrdersByEmail,
  getAllOrders,
  updateOrderStatus,
};