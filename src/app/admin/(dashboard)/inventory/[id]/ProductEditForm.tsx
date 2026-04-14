"use client";

import type { Product, ProductVariant } from "@prisma/client";
import { useRouter } from "next/navigation";
import { AdminProductImageFields } from "@/components/admin/AdminProductImageFields";
import { ProductVariantFields } from "@/components/admin/ProductVariantFields";
import { updateProduct } from "../actions";

type Props = {
  product: Product & { variants: ProductVariant[] };
};

export function ProductEditForm({ product }: Props) {
  const router = useRouter();

  async function saveProduct(formData: FormData) {
    await updateProduct(formData);
    router.refresh();
  }

  return (
    <form action={saveProduct} className="mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
      <input type="hidden" name="id" value={product.id} />
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
          Total stock on storefront is the sum of variant rows below ({product.stockQuantity} units).
        </div>
        <ProductVariantFields initial={product.variants} />
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
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-600">Colors</label>
          <input
            name="colors"
            defaultValue={product.colors.join(", ")}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-600">Sizes</label>
          <input
            name="sizes"
            defaultValue={product.sizes.join(", ")}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <AdminProductImageFields
          defaultUrlsText={product.imageUrls.join("\n")}
          defaultListImageIndex={product.listImageIndex ?? 0}
          defaultListImagePosition={product.listImagePosition ?? "center"}
        />
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-600">Video URLs</label>
          <textarea
            name="videoUrls"
            rows={2}
            defaultValue={product.videoUrls.join("\n")}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono text-xs"
          />
        </div>
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
