import type { Metadata } from "next";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { CartClient } from "@/components/cart/CartClient";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review your bag and proceed to secure checkout — Magenta Crown.",
  robots: { index: false, follow: true }
};

export default async function CartPage() {
  const supabase = getSupabaseServiceRoleClient();
  const { data: upsells, error } = await (supabase.from("Product") as any)
    .select("*,variants:ProductVariant(stock,isActive)")
    .eq("status", "ACTIVE")
    .order("createdAt", { ascending: false })
    .limit(3);
  if (error) throw new Error(error.message);

  return <CartClient upsells={upsells} />;
}
