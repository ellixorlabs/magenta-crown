import Link from "next/link";
import { requireMerchAdmin } from "@/lib/admin-auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { ProductCreateFormClient } from "../ProductCreateFormClient";

export const metadata = { title: "Add product | Admin" };

export default async function AdminNewProductPage() {
  await requireMerchAdmin("/admin/inventory/new");
  const supabase = getSupabaseServiceRoleClient();
  const [couponsRes, attributeRowsRes] = await Promise.all([
    (supabase.from("Coupon") as any)
      .select("id,code,discountPct,isActive")
      .order("code", { ascending: true }),
    (supabase.from("Product") as any).select("occasion,material,tags").limit(1200)
  ]);
  const { data: coupons, error } = couponsRes;
  if (error) throw new Error(error.message);
  if (attributeRowsRes.error) throw new Error(attributeRowsRes.error.message);
  const rows = (attributeRowsRes.data ?? []) as Array<{ occasion: string | null; material: string | null; tags: string[] | null }>;
  const occasionOptions = [...new Set(rows.map((r) => (r.occasion ?? "").trim()).filter(Boolean))];
  const materialOptions = [...new Set(rows.map((r) => (r.material ?? "").trim()).filter(Boolean))];
  const tagOptions = [...new Set(rows.flatMap((r) => r.tags ?? []).map((t) => t.trim()).filter(Boolean))];

  return (
    <div className="space-y-6">
      <p className="text-sm">
        <Link href="/admin/inventory" className="text-crown-800 underline">
          ← Inventory
        </Link>
      </p>
      <ProductCreateFormClient
        coupons={coupons}
        occasionOptions={occasionOptions}
        materialOptions={materialOptions}
        tagOptions={tagOptions}
      />
    </div>
  );
}
