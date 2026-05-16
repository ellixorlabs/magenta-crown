import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { notifyMerchAdmins } from "@/lib/ops-notifications";
import { fetchVerifiedReviewEligibleLines } from "@/lib/review-eligibility";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { randomId } from "@/lib/random-id";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in to review." }, { status: 401 });
    }

    const body = (await req.json()) as {
      productId: string;
      authorName?: string;
      rating: number;
      title?: string;
      body?: string;
      /** `orderItemId|orderId` when multiple eligible lines; omitted when server passes single line. */
      lineKey?: string;
      orderItemId?: string;
      orderId?: string;
    };

    if (!body.productId || !Number.isFinite(body.rating) || body.rating < 1 || body.rating > 5) {
      return NextResponse.json({ error: "Invalid review" }, { status: 400 });
    }

    let orderItemId = String(body.orderItemId ?? "").trim();
    let orderId = String(body.orderId ?? "").trim();
    if (body.lineKey?.includes("|")) {
      const [a, b] = body.lineKey.split("|");
      orderItemId = (a ?? "").trim();
      orderId = (b ?? "").trim();
    }

    const supabase = getSupabaseServiceRoleClient();
    const eligible = await fetchVerifiedReviewEligibleLines(supabase, session.user.id, body.productId);
    const match = eligible.find((e) => e.orderItemId === orderItemId && e.orderId === orderId);
    if (!match) {
      return NextResponse.json({ error: "Verified purchase required to review." }, { status: 403 });
    }

    const authorName = (body.authorName ?? session.user.name ?? session.user.email ?? "Customer").trim() || "Customer";

    const { data: review, error } = await (supabase.from("Review") as any)
      .insert({
        id: randomId(),
        productId: body.productId,
        userId: session.user.id,
        authorName,
        rating: body.rating,
        title: body.title ?? null,
        body: body.body ?? null,
        verifiedPurchase: true,
        orderId,
        orderItemId,
        moderationStatus: "PENDING"
      })
      .select("id")
      .single();
    if (error) {
      return NextResponse.json({ error: "Could not save review" }, { status: 500 });
    }

    await notifyMerchAdmins(supabase, {
      type: "NEW_REVIEW",
      title: "New product review",
      message: `${authorName} reviewed a product (${body.productId.slice(0, 8)}…).`,
      metadata: { reviewId: review.id, productId: body.productId },
      actionUrl: `/admin/inventory/reviews`
    });

    return NextResponse.json({ id: review.id });
  } catch {
    console.error("[reviews] create failed");
    return NextResponse.json({ error: "Could not save review" }, { status: 500 });
  }
}
