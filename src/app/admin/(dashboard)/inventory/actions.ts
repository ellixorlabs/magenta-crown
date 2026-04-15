"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DEFAULT_COLOR, DEFAULT_SIZE } from "@/lib/product-variants";
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
    const color = String(o.color ?? "").trim();
    const stock = Math.max(0, Math.floor(Number(o.stock ?? o.quantity ?? 0)));
    const isActive = o.isActive !== false && o.isActive !== "false";
    const k = `${color}\t${size}`;
    const prev = merged.get(k);
    merged.set(k, {
      color: color || DEFAULT_COLOR,
      size: size || DEFAULT_SIZE,
      stock: (prev?.stock ?? 0) + stock,
      isActive
    });
  }
  return [...merged.values()];
}

function ensureVariantRows(rows: ParsedRow[]): ParsedRow[] {
  if (rows.length === 0) {
    return [{ color: DEFAULT_COLOR, size: DEFAULT_SIZE, stock: 0, isActive: true }];
  }
  return rows;
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
  const imageUrls = parseList(String(formData.get("imageUrls") ?? ""));
  let listImageIndex = Math.max(0, Math.floor(Number(formData.get("listImageIndex") ?? 0)));
  if (imageUrls.length > 0) {
    listImageIndex = Math.min(listImageIndex, imageUrls.length - 1);
  } else {
    listImageIndex = 0;
  }
  const listImagePosition =
    String(formData.get("listImagePosition") ?? "center").trim() || "center";

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
  const imageUrls = parseList(String(formData.get("imageUrls") ?? ""));
  let listImageIndex = Math.max(0, Math.floor(Number(formData.get("listImageIndex") ?? 0)));
  if (imageUrls.length > 0) {
    listImageIndex = Math.min(listImageIndex, imageUrls.length - 1);
  } else {
    listImageIndex = 0;
  }
  const listImagePosition =
    String(formData.get("listImagePosition") ?? "center").trim() || "center";

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
        videoUrls: parseList(String(formData.get("videoUrls") ?? ""))
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
