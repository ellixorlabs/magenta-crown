import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isStaffRole } from "@/lib/admin-permissions";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { getSupabaseUserFromRequest, resolveAppUserIdFromSupabaseUser } from "@/lib/supabase-server-auth";

type ServiceClient = ReturnType<typeof getSupabaseServiceRoleClient>;

async function wishlistItemCount(supabase: ServiceClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("_UserWishlist")
    .select("*", { count: "exact", head: true })
    .eq("B", userId);
  if (error) return 0;
  return count ?? 0;
}

type ResolvedUser =
  | { ok: true; userId: string; supabase: ServiceClient; role: string }
  | { ok: false; response: NextResponse };

async function resolveRequestUser(req: Request): Promise<ResolvedUser> {
  const supaUser = await getSupabaseUserFromRequest(req);
  const session = supaUser ? null : await auth();
  const resolvedSupabaseUserId = supaUser ? await resolveAppUserIdFromSupabaseUser(supaUser) : null;
  const userId = resolvedSupabaseUserId ?? session?.user?.id;
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const supabase = getSupabaseServiceRoleClient();
  const profile = await supabase.from("User").select("role").eq("id", userId).maybeSingle<{ role: string }>();
  const role = profile.data?.role ?? "CUSTOMER";
  return { ok: true, userId, supabase, role };
}

export async function GET(req: Request) {
  const resolved = await resolveRequestUser(req);
  if (!resolved.ok) return resolved.response;

  const { userId, supabase, role } = resolved;
  if (isStaffRole(role)) {
    return NextResponse.json({ count: 0 });
  }

  const count = await wishlistItemCount(supabase, userId);
  return NextResponse.json({ count });
}

export async function POST(req: Request) {
  const resolved = await resolveRequestUser(req);
  if (!resolved.ok) return resolved.response;

  const { userId, supabase, role } = resolved;
  if (isStaffRole(role)) {
    return NextResponse.json({ error: "Staff accounts cannot use wishlist" }, { status: 403 });
  }

  const body = (await req.json()) as { productId?: string; wishlist?: boolean };
  const productId = body.productId;
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const product = await supabase.from("Product").select("id").eq("id", productId).maybeSingle<{ id: string }>();
  if (!product.data) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const wishlist = Boolean(body.wishlist);

  if (wishlist) {
    const insert = await (supabase.from("_UserWishlist") as any).upsert(
      { A: productId, B: userId },
      { onConflict: "A,B" }
    );
    if (insert.error) {
      return NextResponse.json({ error: "Failed to update wishlist" }, { status: 500 });
    }
  } else {
    const remove = await supabase.from("_UserWishlist").delete().eq("A", productId).eq("B", userId);
    if (remove.error) {
      return NextResponse.json({ error: "Failed to update wishlist" }, { status: 500 });
    }
  }

  const count = await wishlistItemCount(supabase, userId);
  return NextResponse.json({ ok: true, wishlisted: wishlist, count });
}
