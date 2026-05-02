import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin-auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import type { NextAppPageParams } from "@/types/next-app";
import { ProductEditForm } from "./ProductEditForm";

type PageProps = NextAppPageParams<{ id: string }>;

export default async function EditProductPage({ params }: PageProps) {
  await requireStaff("/admin/inventory");

  const { id } = await params;
  const supabase = getSupabaseServiceRoleClient();
  const [product, coupons, attributeRows] = await Promise.all([
    (supabase.from("Product") as any)
      .select("*,variants:ProductVariant(*),featuredCoupons:ProductFeaturedCoupon(couponId)")
      .eq("id", id)
      .maybeSingle(),
    (supabase.from("Coupon") as any)
      .select("id,code,discountPct,isActive")
      .order("code", { ascending: true }),
    (supabase.from("Product") as any).select("occasion,material,tags").limit(1200)
  ]);
  if (product.error) throw new Error(product.error.message);
  if (coupons.error) throw new Error(coupons.error.message);
  if (attributeRows.error) throw new Error(attributeRows.error.message);
  if (!product.data) {
    notFound();
  }
  const rows = (attributeRows.data ?? []) as Array<{ occasion: string | null; material: string | null; tags: string[] | null }>;
  const occasionOptions = [...new Set(rows.map((r) => (r.occasion ?? "").trim()).filter(Boolean))];
  const materialOptions = [...new Set(rows.map((r) => (r.material ?? "").trim()).filter(Boolean))];
  const tagOptions = [...new Set(rows.flatMap((r) => r.tags ?? []).map((t) => t.trim()).filter(Boolean))];

  return (
    <div>
      <Link href="/admin/inventory" className="text-sm text-crown-800 underline">
        ← Back to inventory
      </Link>
      <h2 className="mt-4 text-xl font-semibold text-zinc-900">Edit product</h2>
      <ProductEditForm
        product={product.data}
        coupons={coupons.data ?? []}
        occasionOptions={occasionOptions}
        materialOptions={materialOptions}
        tagOptions={tagOptions}
      />
    </div>
  );
}
