import crypto from "crypto";

export function getRazorpayConfig() {
  const keyId =
    process.env.RAZORPAY_KEY_ID?.trim() || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || "";
  return { keyId, keySecret, enabled: Boolean(keyId && keySecret) };
}

export type RazorpayCreateOrderResult =
  | { ok: true; id: string; amount: number; currency: string }
  | { ok: false; status: number; error: string };

/** Creates a Razorpay order via REST. `amountPaise` must be ≥ 100. */
export async function createRazorpayOrderRest(params: {
  amountPaise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayCreateOrderResult> {
  const { keyId, keySecret, enabled } = getRazorpayConfig();
  if (!enabled) {
    return { ok: false, status: 500, error: "Razorpay is not configured on server." };
  }
  const amount = Math.trunc(params.amountPaise);
  if (!Number.isFinite(amount) || amount < 100) {
    return { ok: false, status: 400, error: "amount must be at least 100 paise." };
  }

  const receipt = params.receipt.trim().slice(0, 40) || `rcpt_${Date.now()}`;
  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
  const rpRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount,
      currency: params.currency,
      receipt,
      notes: params.notes
    })
  });

  const rpData = (await rpRes.json()) as {
    id?: string;
    amount?: number;
    currency?: string;
    error?: { description?: string; code?: string };
  };

  if (!rpRes.ok || !rpData.id) {
    const msg = rpData.error?.description || "Could not create Razorpay order.";
    if (rpRes.status === 401) {
      return { ok: false, status: 401, error: msg };
    }
    const status = rpRes.status >= 400 && rpRes.status < 600 ? rpRes.status : 502;
    return { ok: false, status, error: msg };
  }

  return {
    ok: true,
    id: rpData.id,
    amount: typeof rpData.amount === "number" ? rpData.amount : amount,
    currency: typeof rpData.currency === "string" ? rpData.currency : params.currency
  };
}

export function signRazorpayPayload(orderId: string, paymentId: string, keySecret: string) {
  return crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
}

