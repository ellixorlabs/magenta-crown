import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canCreateOrDeleteProducts, canManageInventory } from "@/lib/admin-auth";
import { clearCacheByPrefix } from "@/lib/cache";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !canManageInventory(role)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { action?: "archive" | "delete" };
  const action = body.action;
  if (!id || (action !== "archive" && action !== "delete")) {
    return NextResponse.json({ success: false, message: "Invalid request." }, { status: 400 });
  }

  if (action === "delete" && !canCreateOrDeleteProducts(role)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
  }

  const supabase = getSupabaseServiceRoleClient();
  const orderLines = await supabase
    .from("OrderItem")
    .select("id", { count: "exact", head: true })
    .eq("productId", id);
  if (orderLines.error) {
    return NextResponse.json({ success: false, message: orderLines.error.message }, { status: 500 });
  }
  const hasOrders = (orderLines.count ?? 0) > 0;

  if (action === "delete") {
    if (hasOrders) {
      return NextResponse.json(
        {
          success: false,
          message: "This product appears in past orders and cannot be deleted. Archive it instead."
        },
        { status: 409 }
      );
    }
    const remove = await supabase.from("Product").delete().eq("id", id);
    if (remove.error) {
      return NextResponse.json({ success: false, message: remove.error.message }, { status: 500 });
    }
  } else {
    const archive = await (supabase.from("Product") as any).update({ status: "ARCHIVED" }).eq("id", id);
    if (archive.error) {
      return NextResponse.json({ success: false, message: archive.error.message }, { status: 500 });
    }
  }

  clearCacheByPrefix("products");
  clearCacheByPrefix("homepage");
  return NextResponse.json({ success: true });
}

