import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/admin-auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { getShopFilterOptions } from "@/lib/shop-filter-options";
import { buildProductOrderBy, buildProductWhere, firstString, parseShopSearchParams } from "@/lib/shop-query";
import { normalizeProductStatus } from "@/lib/product-status";
import { getProductTotalStock } from "@/lib/variant-stock";
import { ShopFilters } from "@/components/shop/ShopFilters";
import type { NextAppPageSearch } from "@/types/next-app";
import { AdminInventoryActions } from "@/components/admin/AdminInventoryActions";

type PageProps = NextAppPageSearch<Record<string, string | string[] | undefined>>;

export default async function AdminInventoryPage({ searchParams }: PageProps) {
  const session = await auth();
  const admin = isAdminRole(session?.user?.role);

  const sp = await searchParams;
  const deleteError = firstString(sp.deleteError);
  const where = buildProductWhere(sp);
  const { sort } = parseShopSearchParams(sp);
  const orderBy = buildProductOrderBy(sort);
  const supabase = getSupabaseServiceRoleClient();

  const [filterOptions, productsRaw] = await Promise.all([
    getShopFilterOptions({ includeAllStatuses: true }),
    (supabase.from("Product") as any)
      .select("id,name,slug,mrp,discountedPrice,status,variants:ProductVariant(stock,isActive,color,size)")
      .limit(1000)
  ]);
  if (productsRaw.error) throw new Error(productsRaw.error.message);
  const filtered = (productsRaw.data ?? []).filter(where).sort(orderBy).slice(0, 300);
  const productIds = filtered.map((p: { id: string }) => p.id);
  const orderItemsRes =
    productIds.length > 0
      ? await (supabase.from("OrderItem") as any).select("productId").in("productId", productIds)
      : { data: [], error: null };
  if (orderItemsRes.error) throw new Error(orderItemsRes.error.message);
  const productsWithOrders = new Set(
    ((orderItemsRes.data ?? []) as Array<{ productId: string }>).map((r) => r.productId)
  );

  const products = [...filtered].sort(
    (a, b) => getProductTotalStock(a.variants) - getProductTotalStock(b.variants)
  );

  return (
    <div className="space-y-8">
      {deleteError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{deleteError}</div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Inventory & stock</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Lowest total variant stock appears first. Use filters to narrow products, then edit to manage SKUs.
          </p>
        </div>
        {admin && (
          <Link
            href="/admin/inventory/new"
            className="inline-flex shrink-0 items-center justify-center self-end rounded-full bg-crown-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-crown-900 active:scale-[0.98] sm:self-start"
          >
            Add new
          </Link>
        )}
      </div>

      <div className="w-full max-w-full">
        <Suspense fallback={<div className="text-sm text-zinc-500">Loading filters…</div>}>
          <ShopFilters options={filterOptions} basePath="/admin/inventory" layout="adminBar" />
        </Suspense>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const displayStock = getProductTotalStock(p.variants);
              return (
                <tr key={p.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex min-w-[2.5rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        displayStock <= 0
                          ? "bg-red-100 text-red-800"
                          : displayStock < 5
                            ? "bg-amber-100 text-amber-900"
                            : "bg-emerald-50 text-emerald-800"
                      }`}
                    >
                      {displayStock}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-600">{p.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${
                        normalizeProductStatus(p.status) === "ARCHIVED"
                          ? "bg-zinc-200 text-zinc-700"
                          : normalizeProductStatus(p.status) === "DRAFT"
                            ? "bg-violet-100 text-violet-800"
                            : normalizeProductStatus(p.status) === "SOLD_OUT"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {normalizeProductStatus(p.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    Rs {p.discountedPrice ?? p.mrp}
                    {p.discountedPrice != null && (
                      <span className="ml-1 text-xs text-zinc-400 line-through">{p.mrp}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {admin ? (
                      <AdminInventoryActions
                        productId={p.id}
                        productName={p.name}
                        hasOrders={productsWithOrders.has(p.id)}
                        status={normalizeProductStatus(p.status)}
                      />
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
