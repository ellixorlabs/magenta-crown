"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { createProductAction } from "./actions";
import { AdminProductImageFields } from "@/components/admin/AdminProductImageFields";
import { CreatableChipSelect } from "@/components/admin/CreatableChipSelect";
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

export function ProductCreateFormClient({
  coupons,
  occasionOptions,
  materialOptions,
  tagOptions
}: {
  coupons: CouponOption[];
  occasionOptions: string[];
  materialOptions: string[];
  tagOptions: string[];
}) {
  const router = useRouter();
  const [clientError, setClientError] = useState<string | null>(null);
  const [state, formAction] = useActionState(createProductAction, null);

  useEffect(() => {
    if (state?.success) {
      router.push("/admin/inventory?created=1");
      router.refresh();
    }
  }, [router, state]);

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

      <form
        action={formAction}
        onSubmit={(e) => {
          const form = e.currentTarget;
          const name = String(new FormData(form).get("name") ?? "").trim();
          const mrp = Number(new FormData(form).get("mrp") ?? 0);
          if (!name) {
            e.preventDefault();
            setClientError("Product name is required.");
            return;
          }
          if (!Number.isFinite(mrp) || mrp <= 0) {
            e.preventDefault();
            setClientError("Price must be greater than 0.");
            return;
          }
          setClientError(null);
        }}
        className="mt-6 grid gap-3 sm:grid-cols-2"
      >
        <AdminProductImageFields
          defaultUrlsText=""
          defaultVideoUrlsText=""
          defaultListImageIndex={0}
          defaultListImagePosition="center"
          productId="draft"
        />

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

        <CreatableChipSelect
          label="Occasion"
          name="occasion"
          initialSelected={[]}
          options={occasionOptions}
          multiple={false}
          placeholder="Type occasion and press Enter"
        />
        <Field label="Style" name="style" />
        <CreatableChipSelect
          label="Material"
          name="material"
          initialSelected={[]}
          options={materialOptions}
          multiple={false}
          placeholder="Type material and press Enter"
        />
        <CreatableChipSelect
          label="Tags"
          name="tags"
          initialSelected={[]}
          options={tagOptions}
          multiple
          placeholder="Type tag and press Enter"
        />
        <Field
          label="NEW badge duration (days, only when tag includes 'new')"
          name="newTagDurationDays"
          type="number"
          defaultValue="21"
        />

        <ProductFeaturedCouponPicker coupons={coupons} selectedIds={[]} />

        <Field label="Fit notes" name="fitNotes" />
        <Field label="Care instructions" name="careInstructions" />
        <div className="sm:col-span-2">
          <SubmitButton />
          {clientError ? <p className="mt-2 text-sm text-red-600">{clientError}</p> : null}
          {!state?.success && state?.message ? (
            <p className="mt-2 text-sm text-red-600">{state.message}</p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
