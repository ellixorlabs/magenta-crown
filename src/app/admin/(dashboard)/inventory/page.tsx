import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getShopFilterOptions } from "@/lib/shop-filter-options";
import { buildProductOrderBy, buildProductWhere, firstString, parseShopSearchParams } from "@/lib/shop-query";
import { getProductTotalStock } from "@/lib/variant-stock";
import { ShopFilters } from "@/components/shop/ShopFilters";
import { deleteProductForm, updateProductStockForm } from "./actions";

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

  const [filterOptions, products] = await Promise.all([
    getShopFilterOptions(),
    prisma.product.findMany({
      where,
      orderBy: [{ stockQuantity: "asc" }, orderBy],
      take: 300,
      include: {
        variants: { select: { quantity: true } },
        _count: { select: { variants: true } }
      }
    })
  ]);

  return (
    <div className="space-y-8">
      {deleteError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{deleteError}</div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Inventory & stock</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Lowest stock appears first. Use filters (dropdowns) to narrow products, then edit or restock.
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
              const displayStock = getProductTotalStock(p.variants, p.stockQuantity);
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
                  {p._count.variants > 1 ? (
                    <p className="max-w-[12rem] text-xs text-zinc-500">
                      Multiple variants — set stock in{" "}
                      <Link href={`/admin/inventory/${p.id}`} className="font-medium text-crown-800 underline">
                        Edit
                      </Link>
                      .
                    </p>
                  ) : (
                    <form action={updateProductStockForm} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="productId" value={p.id} />
                      <input
                        type="number"
                        name="stock"
                        min={0}
                        defaultValue={displayStock}
                        className="w-20 rounded border border-zinc-300 px-2 py-1"
                      />
                      <button
                        type="submit"
                        className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-white transition active:scale-[0.98]"
                      >
                        Save
                      </button>
                    </form>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
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
