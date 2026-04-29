import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSupabaseUserFromRequest, resolveAppUserIdFromSupabaseUser } from "@/lib/supabase-server-auth";

export async function POST(req: Request) {
  const supaUser = await getSupabaseUserFromRequest(req);
  const session = supaUser ? null : await auth();
  const resolvedSupabaseUserId = supaUser ? await resolveAppUserIdFromSupabaseUser(supaUser) : null;
  const userId = resolvedSupabaseUserId ?? session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });
  const role = profile?.role ?? "CUSTOMER";
  if (role === "ADMIN" || role === "SUB_ADMIN" || role === "TECH_SUPPORT") {
    return NextResponse.json({ error: "Staff accounts cannot use wishlist" }, { status: 403 });
  }

  const body = (await req.json()) as { productId?: string; wishlist?: boolean };
  const productId = body.productId;
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const wishlist = Boolean(body.wishlist);

  if (wishlist) {
    await prisma.user.update({
      where: { id: userId },
      data: { wishlist: { connect: { id: productId } } }
    });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { wishlist: { disconnect: { id: productId } } }
    });
  }

  return NextResponse.json({ ok: true, wishlisted: wishlist });
}
