"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { createProduct } from "./actions";
import { AdminProductImageFields } from "@/components/admin/AdminProductImageFields";
import { ProductVariantFields } from "@/components/admin/ProductVariantFields";

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

export function ProductCreateFormClient() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-zinc-900">Add product</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Tags / colors / sizes: comma-separated. Leave slug empty to auto-generate.
          </p>
        </div>
        <Link href="/admin/inventory" className="text-sm font-medium text-crown-800 underline">
          Back to inventory
        </Link>
      </div>

      <form action={createProduct} className="mt-6 grid gap-3 sm:grid-cols-2">
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
        <Field label="Stock (fallback)" name="stockQuantity" type="number" defaultValue="0" />
        <p className="sm:col-span-2 text-xs text-zinc-500">
          If all variant rows below are 0, the fallback stock number is used for a single default option.
        </p>
        <ProductVariantFields initial={[]} />
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
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-600">Colors (comma-separated)</label>
          <input name="colors" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-600">Sizes (comma-separated)</label>
          <input
            name="sizes"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="S, M, L, XL"
          />
        </div>

        <AdminProductImageFields defaultUrlsText="" defaultListImageIndex={0} defaultListImagePosition="center" />

        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-600">Video URLs (optional)</label>
          <textarea name="videoUrls" rows={2} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono text-xs" />
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
