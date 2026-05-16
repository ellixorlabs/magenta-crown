"use server";

import { revalidatePath } from "next/cache";
import {
  isExchangeStatus,
  isOrderStatus,
  isPaymentStatus,
  isReturnStatus
} from "@/lib/order-domain";
import { encodeOrderRefForUrl } from "@/lib/order-public-ref";
import { restoreStockForOrderLines } from "@/lib/order-stock";
import { insertOrderTimelineEvent } from "@/lib/order-timeline";
import { orderQualifiesForCouponAnalytics, recordCouponUsageIfEligible } from "@/lib/coupon-analytics";
import { requireMerchAdmin } from "@/lib/admin-auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { enqueueTransactionalEmail } from "@/lib/transactional-email-queue";

function optTrim(v: FormDataEntryValue | null): string | null {
  const t = String(v ?? "").trim();
  return t.length ? t : null;
}

function diffRecord(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    const a = before[k];
    const b = after[k];
    if (a !== b) out[k] = { from: a, to: b };
  }
  return out;
}

export async function updateAdminOrderForm(formData: FormData) {
  const session = await requireMerchAdmin("/admin/orders");
  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) throw new Error("Missing order id.");

  const publicOrderRefRaw = optTrim(formData.get("publicOrderRef"));
  const publicOrderRef = publicOrderRefRaw;

  const osRaw = String(formData.get("orderStatus") ?? "").trim();
  const psRaw = String(formData.get("paymentStatus") ?? "").trim();
  const rsRaw = String(formData.get("returnStatus") ?? "").trim();
  const xsRaw = String(formData.get("exchangeStatus") ?? "").trim();

  if (!isOrderStatus(osRaw)) throw new Error("Invalid order status.");
  if (!isPaymentStatus(psRaw)) throw new Error("Invalid payment status.");
  if (!isReturnStatus(rsRaw)) throw new Error("Invalid return status.");
  if (!isExchangeStatus(xsRaw)) throw new Error("Invalid exchange status.");

  const trackingNumber = optTrim(formData.get("trackingNumber"));
  const courierPartner = optTrim(formData.get("courierPartner"));
  const trackingUrl = optTrim(formData.get("trackingUrl"));
  const adminNotes = optTrim(formData.get("adminNotes"));

  const supabase = getSupabaseServiceRoleClient();
  const { data: prev, error: loadErr } = await (supabase.from("Order") as any)
    .select(
      "id,orderStatus,paymentStatus,returnStatus,exchangeStatus,trackingNumber,courierPartner,trackingUrl,adminNotes,deliveredAt,cancelledAt,publicOrderRef,userId,couponId,discountAmount,totalAmount,paymentMethod"
    )
    .eq("id", orderId)
    .maybeSingle();
  if (loadErr) throw new Error(loadErr.message);
  if (!prev) throw new Error("Order not found.");

  const prevOs = String(prev.orderStatus ?? "");
  const prevRs = String(prev.returnStatus ?? "");
  const prevPs = String(prev.paymentStatus ?? "");
  const nextOs = osRaw;

  if (nextOs === "CANCELLED" && prevOs !== "CANCELLED") {
    await restoreStockForOrderLines(supabase, orderId);
  }

  let deliveredAt: string | null = prev.deliveredAt ?? null;
  let cancelledAt: string | null = prev.cancelledAt ?? null;
  const nowIso = new Date().toISOString();
  if (nextOs === "DELIVERED" && !deliveredAt) deliveredAt = nowIso;
  if (nextOs === "CANCELLED" && !cancelledAt) cancelledAt = nowIso;

  const patch = {
    orderStatus: nextOs,
    paymentStatus: psRaw,
    returnStatus: rsRaw,
    exchangeStatus: xsRaw,
    trackingNumber,
    courierPartner,
    trackingUrl,
    adminNotes,
    deliveredAt,
    cancelledAt
  };

  const { error: upErr } = await (supabase.from("Order") as any).update(patch).eq("id", orderId);
  if (upErr) throw new Error(upErr.message);

  if (nextOs === "CANCELLED" && prevOs !== "CANCELLED") {
    await (supabase.from("CouponUsage") as any).delete().eq("orderId", orderId);
  }

  const mergedForCoupon = {
    id: orderId,
    userId: (prev.userId as string | null) ?? null,
    couponId: (prev.couponId as string | null) ?? null,
    discountAmount: (prev.discountAmount as number | null) ?? null,
    totalAmount: (prev.totalAmount as number | null) ?? null,
    orderStatus: nextOs,
    paymentStatus: psRaw,
    paymentMethod: (prev.paymentMethod as string | null) ?? null
  };
  const prevForCoupon = {
    orderStatus: prevOs,
    paymentStatus: String(prev.paymentStatus ?? ""),
    paymentMethod: (prev.paymentMethod as string | null) ?? null
  };
  if (
    orderQualifiesForCouponAnalytics(mergedForCoupon) &&
    !orderQualifiesForCouponAnalytics(prevForCoupon)
  ) {
    await recordCouponUsageIfEligible(supabase, mergedForCoupon);
  }

  const beforeSnap: Record<string, unknown> = {
    orderStatus: prev.orderStatus,
    paymentStatus: prev.paymentStatus,
    returnStatus: prev.returnStatus,
    exchangeStatus: prev.exchangeStatus,
    trackingNumber: prev.trackingNumber ?? null,
    courierPartner: prev.courierPartner ?? null,
    trackingUrl: prev.trackingUrl ?? null,
    adminNotes: prev.adminNotes ?? null,
    deliveredAt: prev.deliveredAt ?? null,
    cancelledAt: prev.cancelledAt ?? null
  };
  const afterSnap: Record<string, unknown> = { ...beforeSnap, ...patch };
  const changes = diffRecord(beforeSnap, afterSnap);
  const changedKeys = Object.keys(changes);
  const title =
    changedKeys.length === 0
      ? "Admin update (no field changes)"
      : `Admin update: ${changedKeys.slice(0, 4).join(", ")}${changedKeys.length > 4 ? "…" : ""}`;

  await insertOrderTimelineEvent(supabase, {
    orderId,
    type: "ADMIN_UPDATE",
    title,
    description: changedKeys.length ? "Order fields updated from admin." : null,
    metadata: { changes },
    actorRole: session.user.role,
    actorId: session.user.id
  });

  const publicRef = (prev.publicOrderRef as string | null | undefined) ?? "";
  const uid = (prev.userId as string | null | undefined) ?? "";
  if (nextOs === "SHIPPED" && prevOs !== "SHIPPED") {
    await enqueueTransactionalEmail(supabase, "ORDER_SHIPPED", {
      orderId,
      publicOrderRef: publicRef,
      userId: uid
    });
  }
  if (nextOs === "DELIVERED" && prevOs !== "DELIVERED") {
    await enqueueTransactionalEmail(supabase, "ORDER_DELIVERED", {
      orderId,
      publicOrderRef: publicRef,
      userId: uid
    });
  }
  if (rsRaw === "APPROVED" && prevRs !== "APPROVED") {
    await enqueueTransactionalEmail(supabase, "RETURN_APPROVED", {
      orderId,
      publicOrderRef: publicRef,
      userId: uid
    });
  }
  if (
    (psRaw === "REFUNDED" || psRaw === "PARTIALLY_REFUNDED") &&
    prevPs !== "REFUNDED" &&
    prevPs !== "PARTIALLY_REFUNDED"
  ) {
    await enqueueTransactionalEmail(supabase, "REFUND_PROCESSED", {
      orderId,
      publicOrderRef: publicRef,
      userId: uid
    });
  }

  revalidatePath("/admin/orders");
  const refForPath = publicOrderRef ?? (prev.publicOrderRef as string | null | undefined);
  if (refForPath) {
    revalidatePath(`/account/orders/${encodeOrderRefForUrl(refForPath)}`);
  }
  revalidatePath("/checkout/confirmation");
}
