import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { OrderConfirmationView, type ConfirmationOrderPayload } from "@/components/checkout/OrderConfirmationView";
import { looksLikeUuid, normalizePublicOrderRef } from "@/lib/order-public-ref";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import type { NextAppPageSearch } from "@/types/next-app";

type PageProps = NextAppPageSearch<{ orderRef?: string; orderId?: string }>;

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const ref = normalizePublicOrderRef(sp.orderRef);
  if (!ref) {
    return {
      title: "Order confirmation",
      description: "Your Magenta Crown order confirmation.",
      robots: { index: false, follow: true }
    };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return {
      title: "Order confirmation",
      description: "Your Magenta Crown order confirmation.",
      robots: { index: false, follow: true }
    };
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data: order, error } = await (supabase.from("Order") as any)
    .select("publicOrderRef")
    .eq("publicOrderRef", ref)
    .eq("userId", session.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (!order?.publicOrderRef) {
    return { title: "Order confirmation", robots: { index: false, follow: true } };
  }

  return {
    title: "Order confirmed",
    description: `Thank you — your Magenta Crown order ${order.publicOrderRef} has been placed.`,
    robots: { index: false, follow: true }
  };
}

export default async function ConfirmationPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  const sp = await searchParams;
  let ref = normalizePublicOrderRef(sp.orderRef);

  if (!ref && sp.orderId?.trim() && looksLikeUuid(sp.orderId)) {
    const supabase = getSupabaseServiceRoleClient();
    const { data: row } = await (supabase.from("Order") as any)
      .select("publicOrderRef")
      .eq("id", sp.orderId.trim())
      .eq("userId", session.user.id)
      .maybeSingle();
    const legacyRef = row?.publicOrderRef as string | null | undefined;
    if (legacyRef) {
      redirect(`/checkout/confirmation?orderRef=${encodeURIComponent(legacyRef)}`);
    }
    notFound();
  }

  if (!ref) {
    notFound();
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data: order, error } = await (supabase.from("Order") as any)
    .select(
      "publicOrderRef,createdAt,subtotalBeforeDiscount,discountAmount,totalAmount,couponCode,paymentMethod,trackingUrl,shippingAddress,items:OrderItem(id,quantity,price,size,color,product:Product(name,slug,imageUrls,listImageIndex))"
    )
    .eq("publicOrderRef", ref)
    .eq("userId", session.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (!order?.publicOrderRef) {
    notFound();
  }

  return <OrderConfirmationView order={order as ConfirmationOrderPayload} />;
}
