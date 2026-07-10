/**
 * /api/whatsapp-webhook.js
 * --------------------------
 * Vercel serverless function. This is the single URL you give Meta when you
 * set up the WhatsApp Cloud API webhook (Meta Business Suite -> your App ->
 * WhatsApp -> Configuration -> Webhook).
 *
 * GET  — Meta's one-time verification handshake when you first save the
 *        webhook URL. Must echo back `hub.challenge` if `hub.verify_token`
 *        matches WHATSAPP_VERIFY_TOKEN.
 * POST — Meta calls this every time your WhatsApp Business number receives
 *        a message. We only act on messages sent BY YOU (ADMIN_WHATSAPP_NUMBER)
 *        so a customer messaging the shop can never upload a "product" —
 *        everything else is silently ignored (still returns 200, since
 *        Meta requires a fast 200 regardless, or it will retry/backoff).
 *
 * HOW TO ADD A PRODUCT FROM WHATSAPP:
 *   Send a photo to your WhatsApp Business number from your own phone
 *   (ADMIN_WHATSAPP_NUMBER), with a caption like:
 *
 *     Aurelia Wool Coat | 145000 | Outerwear
 *
 *   Format is  Name | Price in Naira | Category  — the price and category
 *   are optional (default price 0, category "Uncategorized") since you can
 *   fix them later in the admin dashboard before approving. It lands in a
 *   PENDING queue — nothing goes live until you approve it in admin.html.
 *
 * REQUIRED ENV VARS:
 *   WHATSAPP_VERIFY_TOKEN     - any string you make up, entered in Meta's
 *                               webhook setup form to match this one
 *   WHATSAPP_TOKEN            - permanent/long-lived access token from
 *                               Meta Business (System User token recommended)
 *   WHATSAPP_PHONE_NUMBER_ID  - your Cloud API phone number ID (found in
 *                               Meta Business -> WhatsApp -> API Setup)
 *   ADMIN_WHATSAPP_NUMBER     - YOUR phone number in international format
 *                               without "+" or spaces, e.g. 2348110818037.
 *                               Only messages from this number are treated
 *                               as product uploads.
 *   BLOB_READ_WRITE_TOKEN     - auto-set once Vercel Blob is attached to the
 *                               project (Storage tab -> Create -> Blob)
 *   KV_REST_API_URL / KV_REST_API_TOKEN - see api/_orders.js
 */

const { put } = require("@vercel/blob");
const { addPendingProduct } = require("./_products");

const GRAPH_BASE = "https://graph.facebook.com/v20.0";

function sendJSON(res, status, body) {
  res.status(status).json(body);
}

// Parses a caption like "Name | Price | Category" into parts.
// Every part is optional except the photo itself.
function parseCaption(caption) {
  if (!caption || typeof caption !== "string") {
    return { name: null, price: null, cat: null };
  }
  const parts = caption.split("|").map((s) => s.trim());
  const [name, priceRaw, cat] = parts;
  const price = priceRaw ? Number(priceRaw.replace(/[^\d.]/g, "")) : null;
  return {
    name: name || null,
    price: Number.isFinite(price) ? price : null,
    cat: cat || null,
  };
}

async function downloadWhatsAppMedia(mediaId, token) {
  // Step 1: resolve the media id to a temporary, authenticated URL.
  const metaRes = await fetch(`${GRAPH_BASE}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meta = await metaRes.json();
  if (!metaRes.ok || !meta.url) {
    throw new Error(meta.error?.message || "Could not resolve media URL.");
  }

  // Step 2: download the actual bytes (also requires the auth header).
  const fileRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!fileRes.ok) {
    throw new Error("Could not download media from WhatsApp.");
  }
  const buffer = Buffer.from(await fileRes.arrayBuffer());
  const contentType = fileRes.headers.get("content-type") || "image/jpeg";
  return { buffer, contentType };
}

async function sendWhatsAppReply(to, text, token, phoneNumberId) {
  try {
    await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    });
  } catch (err) {
    // Non-fatal — the product was still saved even if the reply fails.
    console.error("Failed to send WhatsApp confirmation reply:", err);
  }
}

module.exports = async function handler(req, res) {
  // --- Meta's webhook verification handshake --------------------------------
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      res.status(200).send(challenge);
      return;
    }
    return sendJSON(res, 403, { error: "Verification failed." });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return sendJSON(res, 405, { error: "Method not allowed." });
  }

  // Always acknowledge quickly — Meta retries aggressively on non-200s.
  // We still do the real work before responding since Vercel functions
  // don't support fire-and-forget after the response is sent.
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const ADMIN_NUMBER = process.env.ADMIN_WHATSAPP_NUMBER;

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) {
      // Status updates (delivered/read receipts) etc. — nothing to do.
      return sendJSON(res, 200, { ok: true });
    }

    const from = message.from; // sender's WhatsApp number, no "+"

    if (!ADMIN_NUMBER || from !== ADMIN_NUMBER) {
      // Not you — e.g. a customer messaging the shop number. Ignore.
      return sendJSON(res, 200, { ok: true, ignored: true });
    }

    if (message.type !== "image") {
      if (WHATSAPP_TOKEN && PHONE_NUMBER_ID) {
        await sendWhatsAppReply(
          from,
          "To add a product, send a photo with a caption like: Name | Price | Category",
          WHATSAPP_TOKEN,
          PHONE_NUMBER_ID
        );
      }
      return sendJSON(res, 200, { ok: true, ignored: true });
    }

    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
      console.error("Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID.");
      return sendJSON(res, 200, { ok: false, error: "Not configured." });
    }

    const caption = message.image?.caption;
    const { name, price, cat } = parseCaption(caption);

    // --- Download the photo from WhatsApp and re-host it on Vercel Blob ----
    const { buffer, contentType } = await downloadWhatsAppMedia(
      message.image.id,
      WHATSAPP_TOKEN
    );
    const ext = contentType.includes("png") ? "png" : "jpg";
    const blob = await put(`products/${Date.now()}.${ext}`, buffer, {
      access: "public",
      contentType,
    });

    const product = await addPendingProduct({
      name,
      price,
      cat,
      image: blob.url,
      waMessageId: message.id,
    });

    await sendWhatsAppReply(
      from,
      `Got it! "${product.name}" is waiting in your Pending Products list — review and approve it in the admin dashboard to publish it.`,
      WHATSAPP_TOKEN,
      PHONE_NUMBER_ID
    );

    return sendJSON(res, 200, { ok: true, product });
  } catch (err) {
    console.error("Error handling WhatsApp webhook:", err);
    // Still 200 — Meta will retry a failing webhook repeatedly otherwise,
    // and we don't want a flood of retries for the same message.
    return sendJSON(res, 200, { ok: false, error: "Internal error." });
  }
};