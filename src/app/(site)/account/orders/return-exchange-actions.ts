"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { encodeOrderRefForUrl } from "@/lib/order-public-ref";
import { insertOrderTimelineEvent } from "@/lib/order-timeline";
import { notifyMerchAdmins } from "@/lib/ops-notifications";
import { RETURN_REASON_OPTIONS } from "@/lib/return-exchange-domain";
import {
  canRequestExchangeForLine,
  canRequestReturnForLine
} from "@/lib/return-exchange-eligibility";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { randomId } from "@/lib/random-id";

const REASON_SET = new Set<string>(RETURN_REASON_OPTIONS.map((r) => r.value));

function optTrim(v: FormDataEntryValue | null): string | null {
  const t = String(v ?? "").trim();
  return t.length ? t : null;
}

export async function createReturnRequestFromAccountForm(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sign in required.");

  const orderItemId = String(formData.get("orderItemId") ?? "").trim();
  const orderId = String(formData.get("orderId") ?? "").trim();
  const publicOrderRef = String(formData.get("publicOrderRef") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const description = optTrim(formData.get("description"));
  const customerNotes = optTrim(formData.get("customerNotes"));

  if (!orderItemId || !orderId || !publicOrderRef) throw new Error("Missing order line.");
  if (!REASON_SET.has(reason)) throw new Error("Pick a valid reason.");

  const supabase = getSupabaseServiceRoleClient();
  const { data: line, error: le } = await (supabase.from("OrderItem") as any)
    .select(
      "id,orderId,productId,Order!inner(id,userId,orderStatus,deliveredAt,createdAt,publicOrderRef),product:Product(returnable,returnWindowDays)"
    )
    .eq("id", orderItemId)
    .maybeSingle();
  if (le) throw new Error(le.message);
  if (!line) throw new Error("Line not found.");

  const ord = line.Order as {
    id: string;
    userId: string;
    orderStatus: string;
    deliveredAt: string | null;
    createdAt: string;
    publicOrderRef: string | null;
  };
  if (ord.userId !== session.user.id) throw new Error("Not your order.");
  if (ord.id !== orderId) throw new Error("Order mismatch.");
  if ((ord.publicOrderRef ?? "").trim() !== publicOrderRef) throw new Error("Order reference mismatch.");

  const product = line.product as { returnable: boolean; returnWindowDays: number };
  const { data: openRows } = await (supabase.from("ReturnRequest") as any)
    .select("orderItemId,status")
    .eq("orderId", orderId);
  const openReturns = (openRows ?? []) as Array<{ orderItemId: string | null; status: string }>;

  if (
    !canRequestReturnForLine({
      order: { orderStatus: ord.orderStatus, deliveredAt: ord.deliveredAt, createdAt: ord.createdAt },
      product: { returnable: product.returnable, exchangeable: true, returnWindowDays: product.returnWindowDays },
      orderItemId,
      openReturns
    })
  ) {
    throw new Error("Return not available for this line.");
  }

  const id = randomId();
  const { error: ins } = await (supabase.from("ReturnRequest") as any).insert({
    id,
    orderId,
    orderItemId,
    userId: session.user.id,
    reason,
    description,
    customerNotes,
    status: "REQUESTED",
    mediaUrls: [],
    refundStatus: "NONE"
  });
  if (ins) throw new Error(ins.message);

  await insertOrderTimelineEvent(supabase, {
    orderId,
    type: "RETURN_REQUESTED",
    title: "Return requested",
    description: reason,
    metadata: { returnRequestId: id, orderItemId },
    actorRole: "CUSTOMER",
    actorId: session.user.id
  });

  await notifyMerchAdmins(supabase, {
    type: "RETURN_REQUESTED",
    title: "New return request",
    message: `Return ${id.slice(0, 8)}… for order ${publicOrderRef}`,
    metadata: { returnRequestId: id, orderId, orderItemId },
    actionUrl: `/admin/returns?tab=returns`
  });

  revalidatePath(`/account/orders/${encodeOrderRefForUrl(publicOrderRef)}`);
  revalidatePath("/admin/returns");
}

export async function createExchangeRequestFromAccountForm(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sign in required.");

  const orderItemId = String(formData.get("orderItemId") ?? "").trim();
  const orderId = String(formData.get("orderId") ?? "").trim();
  const publicOrderRef = String(formData.get("publicOrderRef") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const description = optTrim(formData.get("description"));
  const customerNotes = optTrim(formData.get("customerNotes"));
  const requestedVariantId = String(formData.get("requestedVariantId") ?? "").trim();

  if (!orderItemId || !orderId || !publicOrderRef) throw new Error("Missing order line.");
  if (!REASON_SET.has(reason)) throw new Error("Pick a valid reason.");
  if (!requestedVariantId) throw new Error("Pick the size / variant to exchange for.");

  const supabase = getSupabaseServiceRoleClient();
  const { data: line, error: le } = await (supabase.from("OrderItem") as any)
    .select(
      "id,orderId,productId,Order!inner(id,userId,orderStatus,deliveredAt,createdAt,publicOrderRef),product:Product(exchangeable,returnWindowDays)"
    )
    .eq("id", orderItemId)
    .maybeSingle();
  if (le) throw new Error(le.message);
  if (!line) throw new Error("Line not found.");

  const ord = line.Order as {
    id: string;
    userId: string;
    orderStatus: string;
    deliveredAt: string | null;
    createdAt: string;
    publicOrderRef: string | null;
  };
  if (ord.userId !== session.user.id) throw new Error("Not your order.");
  if (ord.id !== orderId) throw new Error("Order mismatch.");
  if ((ord.publicOrderRef ?? "").trim() !== publicOrderRef) throw new Error("Order reference mismatch.");

  const product = line.product as { exchangeable: boolean; returnWindowDays: number };
  const productId = line.productId as string;

  const { data: vRow, error: ve } = await (supabase.from("ProductVariant") as any)
    .select("id,productId,size,color")
    .eq("id", requestedVariantId)
    .maybeSingle();
  if (ve) throw new Error(ve.message);
  if (!vRow || vRow.productId !== productId) throw new Error("Invalid exchange variant.");
  const resolvedRequestedSize = `${String(vRow.size ?? "").trim()} · ${String(vRow.color ?? "").trim()}`.trim();

  const { data: openEx } = await (supabase.from("ExchangeRequest") as any)
    .select("orderItemId,status")
    .eq("orderId", orderId);
  const openExchanges = (openEx ?? []) as Array<{ orderItemId: string | null; status: string }>;

  if (
    !canRequestExchangeForLine({
      order: { orderStatus: ord.orderStatus, deliveredAt: ord.deliveredAt, createdAt: ord.createdAt },
      product: { returnable: true, exchangeable: product.exchangeable, returnWindowDays: product.returnWindowDays },
      orderItemId,
      openExchanges
    })
  ) {
    throw new Error("Exchange not available for this line.");
  }

  const id = randomId();
  const { error: ins } = await (supabase.from("ExchangeRequest") as any).insert({
    id,
    orderId,
    orderItemId,
    userId: session.user.id,
    reason,
    description,
    customerNotes,
    requestedSize: resolvedRequestedSize,
    requestedVariantId,
    status: "REQUESTED",
    mediaUrls: []
  });
  if (ins) throw new Error(ins.message);

  await insertOrderTimelineEvent(supabase, {
    orderId,
    type: "EXCHANGE_REQUESTED",
    title: "Exchange requested",
    description: reason,
    metadata: { exchangeRequestId: id, orderItemId, requestedVariantId },
    actorRole: "CUSTOMER",
    actorId: session.user.id
  });

  await notifyMerchAdmins(supabase, {
    type: "EXCHANGE_REQUESTED",
    title: "New exchange request",
    message: `Exchange ${id.slice(0, 8)}… for order ${publicOrderRef}`,
    metadata: { exchangeRequestId: id, orderId, orderItemId },
    actionUrl: `/admin/returns?tab=exchanges`
  });

  revalidatePath(`/account/orders/${encodeOrderRefForUrl(publicOrderRef)}`);
  revalidatePath("/admin/returns");
}
