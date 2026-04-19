"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizeAdminImageUrl } from "@/lib/admin-image-url";
import { normColorKey, normPart } from "@/lib/product-variants";
import { isAdminRole, requireStaff } from "@/lib/admin-auth";

function parseList(s: string) {
  return s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

type ParsedRow = { color: string; size: string; stock: number; isActive: boolean };

function parseVariantRowsFromForm(formData: FormData): ParsedRow[] {
  const raw = String(formData.get("variantsJson") ?? "[]");
  let arr: unknown[] = [];
  try {
    const p = JSON.parse(raw);
    arr = Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
  const merged = new Map<string, ParsedRow>();
  for (const x of arr) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const size = String(o.size ?? "").trim();
    if (!size) continue;
    const colorRaw = String(o.color ?? "").trim();
    const colorStored = normColorKey(colorRaw) === "" ? "" : colorRaw;
    const stock = Math.max(0, Math.floor(Number(o.stock ?? o.quantity ?? 0)));
    const isActive = o.isActive !== false && o.isActive !== "false";
    const k = `${normColorKey(colorStored)}\t${normPart(size)}`;
    const prev = merged.get(k);
    merged.set(k, {
      color: colorStored,
      size,
      stock: (prev?.stock ?? 0) + stock,
      isActive
    });
  }
  return [...merged.values()];
}

function ensureVariantRows(rows: ParsedRow[]): ParsedRow[] {
  if (rows.length === 0) {
    return [{ color: "", size: "One size", stock: 0, isActive: true }];
  }
  return rows;
}

function parseFeaturedCouponIds(formData: FormData): string[] {
  const raw = String(formData.get("featuredCouponIds") ?? "[]");
  try {
    const p = JSON.parse(raw);
    if (!Array.isArray(p)) return [];
    return p.filter((x): x is string => typeof x === "string" && x.length > 0);
  } catch {
    return [];
  }
}

function productCommerceFields(formData: FormData) {
  const sizeRaw = String(formData.get("sizeChartImageUrl") ?? "").trim();
  const sizeChartImageUrl = sizeRaw ? normalizeAdminImageUrl(sizeRaw) : null;
  const prepaidOfferText = String(formData.get("prepaidOfferText") ?? "").trim() || null;
  const pricingFootnote = String(formData.get("pricingFootnote") ?? "").trim() || null;
  const codVals = formData.getAll("codEnabled");
  const codEnabled = codVals.includes("1") || codVals.includes("on") || codVals.includes("true");
  return { sizeChartImageUrl, prepaidOfferText, pricingFootnote, codEnabled };
}

export async function createProduct(formData: FormData) {
  const session = await requireStaff("/admin/inventory");
  if (!isAdminRole(session.user.role)) {
    throw new Error("Only admins can create products");
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name || !description) throw new Error("Name and description required");

  const slugRaw = String(formData.get("slug") ?? "").trim();
  const mrp = Number(formData.get("mrp"));
  const discountedPrice = formData.get("discountedPrice")
    ? Number(formData.get("discountedPrice"))
    : null;
  const variantRows = ensureVariantRows(parseVariantRowsFromForm(formData));
  const imageUrls = parseList(String(formData.get("imageUrls") ?? "")).map(normalizeAdminImageUrl);
  let listImageIndex = Math.max(0, Math.floor(Number(formData.get("listImageIndex") ?? 0)));
  if (imageUrls.length > 0) {
    listImageIndex = Math.min(listImageIndex, imageUrls.length - 1);
  } else {
    listImageIndex = 0;
  }
  const listImagePosition =
    String(formData.get("listImagePosition") ?? "center").trim() || "center";

  const commerce = productCommerceFields(formData);
  const featuredIds = parseFeaturedCouponIds(formData);

  const created = await prisma.product.create({
    data: {
      ...(slugRaw ? { slug: slugRaw } : {}),
      name,
      description,
      story: String(formData.get("story") ?? "").trim() || null,
      mrp: Number.isFinite(mrp) ? mrp : 0,
      discountedPrice: discountedPrice != null && Number.isFinite(discountedPrice) ? discountedPrice : null,
      category: String(formData.get("category") ?? "Uncategorized").trim() || "Uncategorized",
      tags: parseList(String(formData.get("tags") ?? "")),
      material: String(formData.get("material") ?? "").trim() || null,
      occasion: String(formData.get("occasion") ?? "").trim() || null,
      style: String(formData.get("style") ?? "").trim() || null,
      fitNotes: String(formData.get("fitNotes") ?? "").trim() || null,
      careInstructions: String(formData.get("careInstructions") ?? "").trim() || null,
      imageUrls,
      listImageIndex,
      listImagePosition,
      videoUrls: parseList(String(formData.get("videoUrls") ?? "")),
      ...commerce,
      variants: {
        create: variantRows.map((r) => ({
          size: r.size,
          color: r.color,
          stock: r.stock,
          isActive: r.isActive
        }))
      }
    }
  });

  if (featuredIds.length > 0) {
    const valid = await prisma.coupon.findMany({
      where: { id: { in: featuredIds } },
      select: { id: true }
    });
    const ok = new Set(valid.map((v) => v.id));
    const rows = featuredIds.filter((id) => ok.has(id)).map((couponId) => ({ productId: created.id, couponId }));
    if (rows.length > 0) {
      await prisma.productFeaturedCoupon.createMany({ data: rows, skipDuplicates: true });
    }
  }

  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin/inventory");
  revalidatePath(`/product/${created.slug}`);
  redirect("/admin/inventory");
}

export async function updateProduct(formData: FormData) {
  const session = await requireStaff("/admin/inventory");
  if (!isAdminRole(session.user.role)) {
    throw new Error("Only admins can edit product details");
  }

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const mrp = Number(formData.get("mrp"));
  const discountedPrice = formData.get("discountedPrice")
    ? Number(formData.get("discountedPrice"))
    : null;
  const variantRows = ensureVariantRows(parseVariantRowsFromForm(formData));
  const imageUrls = parseList(String(formData.get("imageUrls") ?? "")).map(normalizeAdminImageUrl);
  let listImageIndex = Math.max(0, Math.floor(Number(formData.get("listImageIndex") ?? 0)));
  if (imageUrls.length > 0) {
    listImageIndex = Math.min(listImageIndex, imageUrls.length - 1);
  } else {
    listImageIndex = 0;
  }
  const listImagePosition =
    String(formData.get("listImagePosition") ?? "center").trim() || "center";

  const commerce = productCommerceFields(formData);
  const featuredIds = parseFeaturedCouponIds(formData);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.productVariant.deleteMany({ where: { productId: id } });
    await tx.productVariant.createMany({
      data: variantRows.map((r) => ({
        productId: id,
        size: r.size,
        color: r.color,
        stock: r.stock,
        isActive: r.isActive
      }))
    });

    await tx.productFeaturedCoupon.deleteMany({ where: { productId: id } });
    if (featuredIds.length > 0) {
      const valid = await tx.coupon.findMany({
        where: { id: { in: featuredIds } },
        select: { id: true }
      });
      const ok = new Set(valid.map((v) => v.id));
      const rows = featuredIds.filter((cid) => ok.has(cid)).map((couponId) => ({ productId: id, couponId }));
      if (rows.length > 0) {
        await tx.productFeaturedCoupon.createMany({ data: rows });
      }
    }

    return tx.product.update({
      where: { id },
      data: {
        ...(slugRaw ? { slug: slugRaw } : {}),
        name,
        description,
        story: String(formData.get("story") ?? "").trim() || null,
        mrp: Number.isFinite(mrp) ? mrp : 0,
        discountedPrice: discountedPrice != null && Number.isFinite(discountedPrice) ? discountedPrice : null,
        category: String(formData.get("category") ?? "Uncategorized").trim() || "Uncategorized",
        tags: parseList(String(formData.get("tags") ?? "")),
        material: String(formData.get("material") ?? "").trim() || null,
        occasion: String(formData.get("occasion") ?? "").trim() || null,
        style: String(formData.get("style") ?? "").trim() || null,
        fitNotes: String(formData.get("fitNotes") ?? "").trim() || null,
        careInstructions: String(formData.get("careInstructions") ?? "").trim() || null,
        imageUrls,
        listImageIndex,
        listImagePosition,
        videoUrls: parseList(String(formData.get("videoUrls") ?? "")),
        ...commerce
      },
      select: { slug: true }
    });
  });

  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath(`/product/${updated.slug}`);
  revalidatePath("/admin/inventory");
  revalidatePath(`/admin/inventory/${id}`);
}

export async function deleteProduct(
  productId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await requireStaff("/admin/inventory");
  if (!isAdminRole(session.user.role)) {
    return { ok: false, message: "Only admins can delete products." };
  }
  const orderLines = await prisma.orderItem.count({ where: { productId } });
  if (orderLines > 0) {
    return {
      ok: false,
      message:
        "This product cannot be deleted because it appears on past orders. Edit the listing to take it off sale instead."
    };
  }
  try {
    await prisma.product.delete({ where: { id: productId } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete failed.";
    return { ok: false, message: msg };
  }
  revalidatePath("/", "layout");
  revalidatePath("/shop");
  revalidatePath("/admin/inventory");
  return { ok: true };
}

export async function deleteProductForm(formData: FormData) {
  const id = String(formData.get("productId") ?? "");
  if (!id) return;
  const result = await deleteProduct(id);
  if (!result.ok) {
    redirect(`/admin/inventory?deleteError=${encodeURIComponent(result.message)}`);
  }
  redirect("/admin/inventory");
}
