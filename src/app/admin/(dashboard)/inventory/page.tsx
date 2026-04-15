import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getShopFilterOptions } from "@/lib/shop-filter-options";
import { buildProductOrderBy, buildProductWhere, firstString, parseShopSearchParams } from "@/lib/shop-query";
import { getProductTotalStock } from "@/lib/variant-stock";
import { ShopFilters } from "@/components/shop/ShopFilters";
import { deleteProductForm } from "./actions";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminInventoryPage({ searchParams }: PageProps) {
  const session = await auth();
  const admin = isAdminRole(session?.user?.role);

  const sp = await searchParams;
  const deleteError = firstString(sp.deleteError);
  const where = buildProductWhere(sp, { applyOutOfStockFilter: false });
  const { sort } = parseShopSearchParams(sp);
  const orderBy = buildProductOrderBy(sort);

  const [filterOptions, productsRaw] = await Promise.all([
    getShopFilterOptions(),
    prisma.product.findMany({
      where,
      orderBy,
      take: 300,
      include: {
        variants: { select: { stock: true, isActive: true } }
      }
    })
  ]);

  const products = [...productsRaw].sort(
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
                    Rs {p.discountedPrice ?? p.mrp}
                    {p.discountedPrice != null && (
                      <span className="ml-1 text-xs text-zinc-400 line-through">{p.mrp}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {admin && (
                        <Link href={`/admin/inventory/${p.id}`} className="text-xs font-medium text-crown-800 underline">
                          Edit
                        </Link>
                      )}
                      {admin && (
                        <form action={deleteProductForm} className="inline">
                          <input type="hidden" name="productId" value={p.id} />
                          <button type="submit" className="text-xs font-medium text-red-600 underline">
                            Delete
                          </button>
                        </form>
                      )}
                    </div>
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
