"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { AdminProductImageFields } from "@/components/admin/AdminProductImageFields";
import { CreatableChipSelect } from "@/components/admin/CreatableChipSelect";
import { ProductFeaturedCouponPicker, type CouponOption } from "@/components/admin/ProductFeaturedCouponPicker";
import { ProductVariantRows } from "@/components/admin/ProductVariantRows";
import type { ProductRow, ProductVariantRow } from "@/lib/db/app-types";
import { getProductTotalStock } from "@/lib/product-variants";
import { updateProduct } from "../actions";

type ProductWithRelations = ProductRow & {
  story?: string | null;
  style?: string | null;
  fitNotes?: string | null;
  careInstructions?: string | null;
  videoUrls: string[];
  variants: ProductVariantRow[];
  featuredCoupons: Array<{ couponId: string }>;
};

type Props = {
  product: ProductWithRelations;
  coupons: CouponOption[];
  occasionOptions: string[];
  materialOptions: string[];
  tagOptions: string[];
};

type EditSnapshot = {
  id: string;
  name: string;
  slug: string;
  description: string;
  story: string;
  mrp: string;
  discountedPrice: string;
  category: string;
  status: string;
  prepaidOfferText: string;
  pricingFootnote: string;
  occasion: string;
  style: string;
  material: string;
  tags: string;
  newTagDurationDays: string;
  fitNotes: string;
  careInstructions: string;
  imageUrls: string;
  listImageIndex: string;
  listImagePosition: string;
  videoUrls: string;
  variantsJson: string;
  featuredCouponIds: string;
};

function snapshotFromProduct(product: ProductWithRelations): EditSnapshot {
  const defaultNewDays = (() => {
    if (!product.newTagExpiresAt) return "21";
    const ms = new Date(product.newTagExpiresAt).getTime() - Date.now();
    return String(Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000))));
  })();
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    story: product.story ?? "",
    mrp: String(product.mrp),
    discountedPrice: product.discountedPrice != null ? String(product.discountedPrice) : "",
    category: product.category,
    status: String((product as { status?: string }).status ?? "ACTIVE"),
    prepaidOfferText: product.prepaidOfferText ?? "",
    pricingFootnote: product.pricingFootnote ?? "",
    occasion: product.occasion ?? "",
    style: product.style ?? "",
    material: product.material ?? "",
    tags: product.tags.join(", "),
    newTagDurationDays: defaultNewDays,
    fitNotes: product.fitNotes ?? "",
    careInstructions: product.careInstructions ?? "",
    imageUrls: product.imageUrls.join("\n"),
    listImageIndex: String(product.listImageIndex ?? 0),
    listImagePosition: product.listImagePosition ?? "center",
    videoUrls: product.videoUrls.join("\n"),
    variantsJson: JSON.stringify(
      product.variants.map((v) => ({
        size: v.size,
        color: v.color,
        stock: v.stock,
        isActive: v.isActive
      }))
    ),
    featuredCouponIds: JSON.stringify(product.featuredCoupons.map((f) => f.couponId))
  };
}

function parseVariantInitial(json: string, productId: string): ProductVariantRow[] {
  try {
    const parsed = JSON.parse(json) as Array<{
      size?: string;
      color?: string;
      stock?: number;
      isActive?: boolean;
    }>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v) => typeof v?.size === "string" && v.size.trim().length > 0)
      .map((v, i) => ({
        id: `${productId}-variant-${i}`,
        productId,
        size: String(v.size ?? "").trim(),
        color: String(v.color ?? "").trim(),
        stock: Math.max(0, Math.floor(Number(v.stock ?? 0))),
        isActive: v.isActive !== false
      }));
  } catch {
    return [];
  }
}

function snapshotFromFormData(formData: FormData, base: EditSnapshot): EditSnapshot {
  const get = (k: keyof EditSnapshot) => String(formData.get(k) ?? base[k]).trim();
  return {
    ...base,
    id: get("id"),
    name: get("name"),
    slug: get("slug"),
    description: get("description"),
    story: get("story"),
    mrp: get("mrp"),
    discountedPrice: get("discountedPrice"),
    category: get("category"),
    status: get("status"),
    prepaidOfferText: get("prepaidOfferText"),
    pricingFootnote: get("pricingFootnote"),
    occasion: get("occasion"),
    style: get("style"),
    material: get("material"),
    tags: get("tags"),
    newTagDurationDays: get("newTagDurationDays"),
    fitNotes: get("fitNotes"),
    careInstructions: get("careInstructions"),
    imageUrls: get("imageUrls"),
    listImageIndex: get("listImageIndex"),
    listImagePosition: get("listImagePosition"),
    videoUrls: get("videoUrls"),
    variantsJson: get("variantsJson"),
    featuredCouponIds: get("featuredCouponIds")
  };
}

export function ProductEditForm({ product, coupons, occasionOptions, materialOptions, tagOptions }: Props) {
  const router = useRouter();
  const totalStock = getProductTotalStock(product.variants);
  const initialSnapshot = useMemo(() => snapshotFromProduct(product), [product]);
  const [present, setPresent] = useState<EditSnapshot>(initialSnapshot);
  const [past, setPast] = useState<EditSnapshot[]>([]);
  const [future, setFuture] = useState<EditSnapshot[]>([]);
  const [formVersion, setFormVersion] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const suppressCaptureRef = useRef(false);
  const captureRafRef = useRef<number | null>(null);

  const selectedCouponIds = useMemo(() => {
    try {
      const parsed = JSON.parse(present.featuredCouponIds) as string[];
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  }, [present.featuredCouponIds]);
  const variantInitial = useMemo(
    () => parseVariantInitial(present.variantsJson, product.id),
    [present.variantsJson, product.id]
  );

  async function saveProduct(formData: FormData) {
    setIsSaving(true);
    try {
      await updateProduct(formData);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  const scheduleCapture = useCallback(() => {
    if (suppressCaptureRef.current) return;
    if (!formRef.current) return;
    if (captureRafRef.current != null) cancelAnimationFrame(captureRafRef.current);
    captureRafRef.current = requestAnimationFrame(() => {
      captureRafRef.current = null;
      const form = formRef.current;
      if (!form || suppressCaptureRef.current) return;
      const next = snapshotFromFormData(new FormData(form), present);
      if (JSON.stringify(next) === JSON.stringify(present)) return;
      setPast((prev) => [...prev, present]);
      setPresent(next);
      setFuture([]);
    });
  }, [present]);

  const restoreSnapshot = useCallback((next: EditSnapshot) => {
    suppressCaptureRef.current = true;
    setPresent(next);
    setFormVersion((v) => v + 1);
    setTimeout(() => {
      suppressCaptureRef.current = false;
    }, 0);
  }, []);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const prev = past[past.length - 1]!;
    setPast((arr) => arr.slice(0, -1));
    setFuture((arr) => [present, ...arr]);
    restoreSnapshot(prev);
  }, [past, present, restoreSnapshot]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0]!;
    setFuture((arr) => arr.slice(1));
    setPast((arr) => [...arr, present]);
    restoreSnapshot(next);
  }, [future, present, restoreSnapshot]);

  return (
    <form
      key={formVersion}
      ref={formRef}
      action={saveProduct}
      onChangeCapture={scheduleCapture}
      onInputCapture={scheduleCapture}
      className="mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6"
    >
      <input type="hidden" name="id" value={present.id} />

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={undo}
          disabled={past.length === 0}
          className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={future.length === 0}
          className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Redo
        </button>
      </div>

      <AdminProductImageFields
        defaultUrlsText={present.imageUrls}
        defaultVideoUrlsText={present.videoUrls}
        defaultListImageIndex={Math.max(0, Number(present.listImageIndex) || 0)}
        defaultListImagePosition={present.listImagePosition || "center"}
        productId={product.id}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" name="name" defaultValue={present.name} required />
        <Field label="Slug (optional, URL-friendly)" name="slug" defaultValue={present.slug} />
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-600">Description</label>
          <textarea
            name="description"
            required
            rows={3}
            defaultValue={present.description}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-600">Story</label>
          <textarea
            name="story"
            rows={2}
            defaultValue={present.story}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <Field label="MRP" name="mrp" type="number" step="0.01" defaultValue={present.mrp} required />
        <Field
          label="Sale price"
          name="discountedPrice"
          type="number"
          step="0.01"
          defaultValue={present.discountedPrice}
        />
        <div>
          <label className="text-xs font-semibold text-zinc-600">Status</label>
          <select
            name="status"
            defaultValue={present.status || "ACTIVE"}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="DRAFT">DRAFT</option>
            <option value="SOLD_OUT">SOLD_OUT</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>
        <Field label="Category" name="category" defaultValue={present.category} />
        <div className="sm:col-span-2 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-600">
          Total stock on the storefront is the sum of active variant rows: <strong>{totalStock}</strong> units.
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-600">Prepaid offer text (optional)</label>
          <input
            name="prepaidOfferText"
            defaultValue={present.prepaidOfferText}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-600">Pricing footnote (optional)</label>
          <textarea
            name="pricingFootnote"
            rows={2}
            defaultValue={present.pricingFootnote}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Default tax/shipping line if left blank"
          />
        </div>

        <ProductVariantRows initial={variantInitial} />
        <CreatableChipSelect
          label="Occasion"
          name="occasion"
          initialSelected={present.occasion ? [present.occasion] : []}
          options={occasionOptions}
          multiple={false}
          placeholder="Type occasion and press Enter"
        />
        <Field label="Style" name="style" defaultValue={present.style} />
        <CreatableChipSelect
          label="Material"
          name="material"
          initialSelected={present.material ? [present.material] : []}
          options={materialOptions}
          multiple={false}
          placeholder="Type material and press Enter"
        />
        <CreatableChipSelect
          label="Tags"
          name="tags"
          initialSelected={present.tags.split(",").map((t) => t.trim()).filter(Boolean)}
          options={tagOptions}
          multiple
          placeholder="Type tag and press Enter"
        />
        <Field
          label="NEW badge duration (days, only when tag includes 'new')"
          name="newTagDurationDays"
          type="number"
          defaultValue={present.newTagDurationDays}
        />

        <ProductFeaturedCouponPicker coupons={coupons} selectedIds={selectedCouponIds} />

        <Field label="Fit notes" name="fitNotes" defaultValue={present.fitNotes} />
        <Field label="Care" name="careInstructions" defaultValue={present.careInstructions} />
      </div>
      <button
        type="submit"
        disabled={isSaving}
        className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSaving ? "Saving changes..." : "Save changes"}
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
