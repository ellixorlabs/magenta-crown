"use client";

import type { Product, ProductFeaturedCoupon, ProductVariant } from "@prisma/client";
import { useRouter } from "next/navigation";
import { AdminProductImageFields } from "@/components/admin/AdminProductImageFields";
import { AdminProductVideoFields } from "@/components/admin/AdminProductVideoFields";
import { ProductFeaturedCouponPicker, type CouponOption } from "@/components/admin/ProductFeaturedCouponPicker";
import { ProductVariantRows } from "@/components/admin/ProductVariantRows";
import { getProductTotalStock } from "@/lib/product-variants";
import { updateProduct } from "../actions";

type ProductWithRelations = Product & {
  variants: ProductVariant[];
  featuredCoupons: Pick<ProductFeaturedCoupon, "couponId">[];
};

type Props = {
  product: ProductWithRelations;
  coupons: CouponOption[];
};

export function ProductEditForm({ product, coupons }: Props) {
  const router = useRouter();
  const totalStock = getProductTotalStock(product.variants);
  const selectedCouponIds = product.featuredCoupons.map((f) => f.couponId);
  const defaultNewDays = (() => {
    if (!product.newTagExpiresAt) return "21";
    const ms = new Date(product.newTagExpiresAt).getTime() - Date.now();
    return String(Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000))));
  })();

  async function saveProduct(formData: FormData) {
    await updateProduct(formData);
    router.refresh();
  }

  return (
    <form action={saveProduct} className="mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
      <input type="hidden" name="id" value={product.id} />

      <AdminProductImageFields
        defaultUrlsText={product.imageUrls.join("\n")}
        defaultListImageIndex={product.listImageIndex ?? 0}
        defaultListImagePosition={product.listImagePosition ?? "center"}
        productId={product.id}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" name="name" defaultValue={product.name} required />
        <Field label="Slug" name="slug" defaultValue={product.slug} required />
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-600">Description</label>
          <textarea
            name="description"
            required
            rows={3}
            defaultValue={product.description}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-600">Story</label>
          <textarea
            name="story"
            rows={2}
            defaultValue={product.story ?? ""}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <Field label="MRP" name="mrp" type="number" step="0.01" defaultValue={String(product.mrp)} required />
        <Field
          label="Sale price"
          name="discountedPrice"
          type="number"
          step="0.01"
          defaultValue={product.discountedPrice != null ? String(product.discountedPrice) : ""}
        />
        <Field label="Category" name="category" defaultValue={product.category} />
        <div className="sm:col-span-2 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-600">
          Total stock on the storefront is the sum of active variant rows: <strong>{totalStock}</strong> units.
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-600">Size chart image URL (optional)</label>
          <input
            name="sizeChartImageUrl"
            type="url"
            defaultValue={product.sizeChartImageUrl ?? ""}
            placeholder="https://…"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          {product.sizeChartImageUrl ? (
            <div className="relative mt-2 h-40 w-full max-w-xs overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.sizeChartImageUrl} alt="Size chart preview" className="h-full w-full object-contain" />
            </div>
          ) : null}
        </div>

        <div className="sm:col-span-2 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-3">
          <input type="hidden" name="codEnabled" value="0" />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
            <input
              type="checkbox"
              name="codEnabled"
              value="1"
              defaultChecked={product.codEnabled !== false}
              className="rounded"
            />
            Allow cash on delivery for this product
          </label>
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-600">Prepaid offer text (optional)</label>
          <input
            name="prepaidOfferText"
            defaultValue={product.prepaidOfferText ?? ""}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-600">Pricing footnote (optional)</label>
          <textarea
            name="pricingFootnote"
            rows={2}
            defaultValue={product.pricingFootnote ?? ""}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Default tax/shipping line if left blank"
          />
        </div>

        <ProductVariantRows initial={product.variants} />
        <Field label="Occasion" name="occasion" defaultValue={product.occasion ?? ""} />
        <Field label="Style" name="style" defaultValue={product.style ?? ""} />
        <Field label="Material" name="material" defaultValue={product.material ?? ""} />
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-600">Tags</label>
          <input
            name="tags"
            defaultValue={product.tags.join(", ")}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <Field
          label="NEW badge duration (days, only when tag includes 'new')"
          name="newTagDurationDays"
          type="number"
          defaultValue={defaultNewDays}
        />

        <ProductFeaturedCouponPicker coupons={coupons} selectedIds={selectedCouponIds} />

        <AdminProductVideoFields defaultUrlsText={product.videoUrls.join("\n")} productId={product.id} />
        <Field label="Fit notes" name="fitNotes" defaultValue={product.fitNotes ?? ""} />
        <Field label="Care" name="careInstructions" defaultValue={product.careInstructions ?? ""} />
      </div>
      <button type="submit" className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white">
        Save changes
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  step
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-zinc-600">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        step={step}
        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
