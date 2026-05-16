"use server";

import { revalidatePath } from "next/cache";
import { isOrderStatus } from "@/lib/order-domain";
import { enqueueTransactionalEmail } from "@/lib/transactional-email-queue";
import { requireMerchAdmin } from "@/lib/admin-auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export async function bulkSetOrderStatus(formData: FormData) {
  await requireMerchAdmin("/admin/orders");
  const rawIds = String(formData.get("orderIds") ?? "").trim();
  const status = String(formData.get("orderStatus") ?? "").trim();
  const ids = rawIds
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40);
  if (!ids.length || !isOrderStatus(status)) throw new Error("Invalid bulk update.");

  const supabase = getSupabaseServiceRoleClient();
  const nowIso = new Date().toISOString();

  for (const id of ids) {
    const { data: prev } = await (supabase.from("Order") as any)
      .select("id,orderStatus,paymentStatus,userId,publicOrderRef,deliveredAt,cancelledAt")
      .eq("id", id)
      .maybeSingle();
    if (!prev) continue;
    const prevOs = String(prev.orderStatus ?? "");
    const patch: Record<string, unknown> = { orderStatus: status };
    if (status === "DELIVERED" && !prev.deliveredAt) patch.deliveredAt = nowIso;
    if (status === "CANCELLED" && !prev.cancelledAt) patch.cancelledAt = nowIso;

    const { error } = await (supabase.from("Order") as any).update(patch).eq("id", id);
    if (error) throw new Error(error.message);

    if (status === "SHIPPED" && prevOs !== "SHIPPED") {
      await enqueueTransactionalEmail(supabase, "ORDER_SHIPPED", {
        orderId: id,
        publicOrderRef: prev.publicOrderRef ?? "",
        userId: prev.userId ?? ""
      });
    }
    if (status === "DELIVERED" && prevOs !== "DELIVERED") {
      await enqueueTransactionalEmail(supabase, "ORDER_DELIVERED", {
        orderId: id,
        publicOrderRef: prev.publicOrderRef ?? "",
        userId: prev.userId ?? ""
      });
    }
  }

  revalidatePath("/admin/orders");
}
