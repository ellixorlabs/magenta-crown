"use server";

import { revalidatePath } from "next/cache";
import {
  isExchangeRequestStatus,
  isRefundStatus,
  isReturnRequestStatus
} from "@/lib/return-exchange-domain";
import { adjustVariantStockById } from "@/lib/order-stock";
import { insertOrderTimelineEvent } from "@/lib/order-timeline";
import { encodeOrderRefForUrl } from "@/lib/order-public-ref";
import { requireMerchAdmin } from "@/lib/admin-auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

function optTrim(v: FormDataEntryValue | null): string | null {
  const t = String(v ?? "").trim();
  return t.length ? t : null;
}

function nowIso() {
  return new Date().toISOString();
}

export async function updateReturnRequestAdminForm(formData: FormData) {
  const session = await requireMerchAdmin("/admin/returns");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing return id.");

  const statusRaw = String(formData.get("status") ?? "").trim();
  if (!isReturnRequestStatus(statusRaw)) throw new Error("Invalid return status.");
  const refundStatusRaw = String(formData.get("refundStatus") ?? "").trim();
  if (!isRefundStatus(refundStatusRaw)) throw new Error("Invalid refund status.");

  const adminNotes = optTrim(formData.get("adminNotes"));
  const customerNotes = optTrim(formData.get("customerNotes"));
  const description = optTrim(formData.get("description"));
  const pickupTrackingNumber = optTrim(formData.get("pickupTrackingNumber"));
  const pickupCourier = optTrim(formData.get("pickupCourier"));
  const refundAmountRaw = optTrim(formData.get("refundAmount"));
  const refundAmount =
    refundAmountRaw != null && Number.isFinite(Number(refundAmountRaw)) ? Number(refundAmountRaw) : null;

  const supabase = getSupabaseServiceRoleClient();
  const { data: prev, error: pe } = await (supabase.from("ReturnRequest") as any)
    .select("id,orderId,orderItemId,status,refundStatus,receivedAt")
    .eq("id", id)
    .maybeSingle();
  if (pe) throw new Error(pe.message);
  if (!prev) throw new Error("Return request not found.");

  const prevStatus = String(prev.status);
  const ts = nowIso();
  const patch: Record<string, unknown> = {
    status: statusRaw,
    refundStatus: refundStatusRaw,
    adminNotes,
    customerNotes,
    description,
    pickupTrackingNumber,
    pickupCourier,
    refundAmount,
    updatedAt: ts
  };

  if (statusRaw === "APPROVED" && prevStatus !== "APPROVED") patch.approvedAt = ts;
  if (statusRaw === "REJECTED" && prevStatus !== "REJECTED") patch.rejectedAt = ts;
  if (statusRaw === "PICKED_UP" && prevStatus !== "PICKED_UP") patch.pickedUpAt = ts;
  if (statusRaw === "RECEIVED" && prevStatus !== "RECEIVED") patch.receivedAt = ts;
  if (statusRaw === "REFUNDED" && prevStatus !== "REFUNDED") patch.refundedAt = ts;

  if (statusRaw === "RECEIVED" && prevStatus !== "RECEIVED" && prev.orderItemId) {
    const { data: li } = await (supabase.from("OrderItem") as any)
      .select("quantity,variantId")
      .eq("id", prev.orderItemId)
      .maybeSingle();
    const line = li as { quantity: number; variantId: string | null } | null;
    if (line?.variantId) {
      await adjustVariantStockById(supabase, line.variantId, line.quantity);
    }
  }

  const { error: up } = await (supabase.from("ReturnRequest") as any).update(patch).eq("id", id);
  if (up) throw new Error(up.message);

  const { data: ord } = await (supabase.from("Order") as any).select("publicOrderRef").eq("id", prev.orderId).maybeSingle();
  const ref = (ord?.publicOrderRef as string | null | undefined)?.trim();

  await insertOrderTimelineEvent(supabase, {
    orderId: prev.orderId,
    type: "RETURN_ADMIN_UPDATE",
    title: `Return ${statusRaw}`,
    description: adminNotes ?? null,
    metadata: { returnRequestId: id, from: prevStatus, to: statusRaw, refundStatus: refundStatusRaw },
    actorRole: session.user.role,
    actorId: session.user.id
  });

  revalidatePath("/admin/returns");
  if (ref) revalidatePath(`/account/orders/${encodeOrderRefForUrl(ref)}`);
}

export async function updateExchangeRequestAdminForm(formData: FormData) {
  const session = await requireMerchAdmin("/admin/returns");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing exchange id.");

  const statusRaw = String(formData.get("status") ?? "").trim();
  if (!isExchangeRequestStatus(statusRaw)) throw new Error("Invalid exchange status.");

  const adminNotes = optTrim(formData.get("adminNotes"));
  const customerNotes = optTrim(formData.get("customerNotes"));
  const description = optTrim(formData.get("description"));

  const supabase = getSupabaseServiceRoleClient();
  const { data: prev, error: pe } = await (supabase.from("ExchangeRequest") as any)
    .select("id,orderId,status")
    .eq("id", id)
    .maybeSingle();
  if (pe) throw new Error(pe.message);
  if (!prev) throw new Error("Exchange request not found.");

  const prevStatus = String(prev.status);
  const ts = nowIso();
  const patch: Record<string, unknown> = {
    status: statusRaw,
    adminNotes,
    customerNotes,
    description,
    updatedAt: ts
  };

  if (statusRaw === "APPROVED" && prevStatus !== "APPROVED") patch.approvedAt = ts;
  if (statusRaw === "REJECTED" && prevStatus !== "REJECTED") patch.rejectedAt = ts;
  if (statusRaw === "PICKED_UP" && prevStatus !== "PICKED_UP") patch.pickedUpAt = ts;
  if (statusRaw === "COMPLETED" && prevStatus !== "COMPLETED") patch.completedAt = ts;

  const { error: up } = await (supabase.from("ExchangeRequest") as any).update(patch).eq("id", id);
  if (up) throw new Error(up.message);

  const { data: ord } = await (supabase.from("Order") as any).select("publicOrderRef").eq("id", prev.orderId).maybeSingle();
  const ref = (ord?.publicOrderRef as string | null | undefined)?.trim();

  await insertOrderTimelineEvent(supabase, {
    orderId: prev.orderId,
    type: "EXCHANGE_ADMIN_UPDATE",
    title: `Exchange ${statusRaw}`,
    description: adminNotes ?? null,
    metadata: { exchangeRequestId: id, from: prevStatus, to: statusRaw },
    actorRole: session.user.role,
    actorId: session.user.id
  });

  revalidatePath("/admin/returns");
  if (ref) revalidatePath(`/account/orders/${encodeOrderRefForUrl(ref)}`);
}
