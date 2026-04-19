"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { createProduct } from "./actions";
import { AdminProductImageFields } from "@/components/admin/AdminProductImageFields";
import { ProductFeaturedCouponPicker, type CouponOption } from "@/components/admin/ProductFeaturedCouponPicker";
import { ProductVariantRows } from "@/components/admin/ProductVariantRows";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
    >
      {pending ? "Creating…" : "Create product"}
    </button>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  defaultValue,
  step
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
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
        placeholder={placeholder}
        defaultValue={defaultValue}
        step={step}
        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

export function ProductCreateFormClient({ coupons }: { coupons: CouponOption[] }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-zinc-900">Add product</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Images first, then copy and pricing. Each variant is one SKU (size + optional color). Slug optional —
            auto-generated if empty.
          </p>
        </div>
        <Link href="/admin/inventory" className="text-sm font-medium text-crown-800 underline">
          Back to inventory
        </Link>
      </div>

      <form action={createProduct} className="mt-6 grid gap-3 sm:grid-cols-2">
        <AdminProductImageFields defaultUrlsText="" defaultListImageIndex={0} defaultListImagePosition="center" />

        <Field label="Name" name="name" required />
        <Field label="Slug (optional, URL-friendly)" name="slug" placeholder="e.g. ruby-silk-saree" />
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-600">Description</label>
          <textarea
            name="description"
            required
            rows={3}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-600">Product story (optional)</label>
          <textarea name="story" rows={2} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <Field label="MRP (Rs)" name="mrp" type="number" step="0.01" required />
        <Field label="Sale price (optional)" name="discountedPrice" type="number" step="0.01" />
        <Field label="Category" name="category" placeholder="Sarees" />

        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-600">Size chart image URL (optional)</label>
          <input
            name="sizeChartImageUrl"
            type="url"
            placeholder="https://…"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-[11px] text-zinc-500">Shown in a modal from the product page size area.</p>
        </div>

        <div className="sm:col-span-2 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-3">
          <input type="hidden" name="codEnabled" value="0" />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
            <input type="checkbox" name="codEnabled" value="1" defaultChecked className="rounded" />
            Allow cash on delivery for this product
          </label>
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-600">Prepaid offer text (optional)</label>
          <input
            name="prepaidOfferText"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="e.g. Extra 5% off on prepaid orders"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-600">Pricing footnote (optional)</label>
          <textarea
            name="pricingFootnote"
            rows={2}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Leave blank to use the default inclusive-of-taxes message on the storefront."
          />
        </div>

        <ProductVariantRows initial={[]} />

        <Field label="Occasion" name="occasion" placeholder="Wedding" />
        <Field label="Style" name="style" />
        <Field label="Material" name="material" />
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-600">Tags (comma-separated)</label>
          <input
            name="tags"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="silk, bridal, red"
          />
        </div>

        <ProductFeaturedCouponPicker coupons={coupons} selectedIds={[]} />

        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-600">Video URLs (optional)</label>
          <textarea name="videoUrls" rows={2} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs" />
        </div>
        <Field label="Fit notes" name="fitNotes" />
        <Field label="Care instructions" name="careInstructions" />
        <div className="sm:col-span-2">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
