const crypto = require("crypto");

const PAYSTACK_BASE = "https://api.paystack.co";

const secretKey = () => process.env.PAYSTACK_SECRET_KEY || "";
const isLiveMode = () => secretKey().startsWith("sk_live_");

const paystackFetch = async (path, init = {}) => {
  const key = secretKey();
  if (!key) {
    const err = new Error("PAYSTACK_SECRET_KEY is not configured");
    err.status = 500;
    throw err;
  }
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.message || `Paystack API error ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
};

exports.initializePayment = async ({ amount, email, reference, callbackUrl, metadata, channels }) => {
  if (!email) throw Object.assign(new Error("Email is required to initialize a Paystack payment"), { status: 400 });
  if (!amount || amount < 100) throw Object.assign(new Error("Amount must be at least 100 kobo (NGN 1)"), { status: 400 });

  const payload = {
    amount: Math.round(Number(amount)),
    email,
    reference,
    callback_url: callbackUrl,
    metadata: metadata || {},
    channels: channels && channels.length ? channels : ["card", "bank", "ussd", "qr"],
  };

  const body = await paystackFetch("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = body.data || {};
  return {
    authorizationUrl: data.authorization_url,
    accessCode: data.access_code,
    reference: data.reference,
    raw: body,
  };
};

exports.verifyPayment = async (reference) => {
  if (!reference) throw Object.assign(new Error("Reference is required"), { status: 400 });
  const body = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`);
  const data = body.data || {};
  return {
    status: mapPaystackStatus(data.status),
    gatewayRef: data.reference,
    amount: data.amount,
    currency: data.currency,
    channel: data.channel,
    paidAt: data.paid_at ? new Date(data.paid_at) : null,
    message: data.gateway_response || data.message || null,
    raw: body,
  };
};

exports.verifyWebhookSignature = (rawBody, signature) => {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
  if (!secret) return false;
  if (!signature || !rawBody) return false;
  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, "utf8"), Buffer.from(signature, "utf8"));
  } catch {
    return false;
  }
};

const mapPaystackStatus = (s) => {
  if (!s) return "pending";
  const k = String(s).toLowerCase();
  if (k === "success") return "success";
  if (k === "failed") return "failed";
  if (k === "abandoned") return "cancelled";
  return "pending";
};

exports.isLiveMode = isLiveMode;
