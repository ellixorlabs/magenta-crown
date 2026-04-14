"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdminRole, requireStaff } from "@/lib/admin-auth";

function parseList(s: string) {
  return s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Merge duplicate size+color rows by summing quantity. */
function parseVariantRowsFromForm(formData: FormData): { size: string; color: string; quantity: number }[] {
  const raw = String(formData.get("variantsJson") ?? "[]");
  let arr: unknown[] = [];
  try {
    const p = JSON.parse(raw);
    arr = Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
  const merged = new Map<string, { size: string; color: string; quantity: number }>();
  for (const x of arr) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const s = String(o.size ?? "").trim();
    const c = String(o.color ?? "").trim();
    const q = Math.max(0, Math.floor(Number(o.quantity ?? 0)));
    const k = `${s}\t${c}`;
    const prev = merged.get(k);
    merged.set(k, { size: s, color: c, quantity: (prev?.quantity ?? 0) + q });
  }
  return [...merged.values()];
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
  const formStock = Math.max(0, Number(formData.get("stockQuantity") ?? 0));
  const variantRows = parseVariantRowsFromForm(formData);
  const finalVariantRows =
    variantRows.length > 0 && variantRows.some((r) => r.quantity > 0)
      ? variantRows
      : [{ size: "", color: "", quantity: formStock }];
  const stockSum = finalVariantRows.reduce((a, r) => a + r.quantity, 0);
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
      colors: parseList(String(formData.get("colors") ?? "")),
      sizes: parseList(String(formData.get("sizes") ?? "")),
      material: String(formData.get("material") ?? "").trim() || null,
      occasion: String(formData.get("occasion") ?? "").trim() || null,
      style: String(formData.get("style") ?? "").trim() || null,
      fitNotes: String(formData.get("fitNotes") ?? "").trim() || null,
      careInstructions: String(formData.get("careInstructions") ?? "").trim() || null,
      stockQuantity: stockSum,
      imageUrls,
      listImageIndex,
      listImagePosition,
      videoUrls: parseList(String(formData.get("videoUrls") ?? "")),
      variants: {
        create: finalVariantRows.map((r) => ({
          size: r.size,
          color: r.color,
          quantity: r.quantity
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
  const variantRows = parseVariantRowsFromForm(formData);
  const finalVariantRows = variantRows.length > 0 ? variantRows : [{ size: "", color: "", quantity: 0 }];
  const stockSum = finalVariantRows.reduce((a, r) => a + r.quantity, 0);
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
      data: finalVariantRows.map((r) => ({
        productId: id,
        size: r.size,
        color: r.color,
        quantity: r.quantity
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
        colors: parseList(String(formData.get("colors") ?? "")),
        sizes: parseList(String(formData.get("sizes") ?? "")),
        material: String(formData.get("material") ?? "").trim() || null,
        occasion: String(formData.get("occasion") ?? "").trim() || null,
        style: String(formData.get("style") ?? "").trim() || null,
        fitNotes: String(formData.get("fitNotes") ?? "").trim() || null,
        careInstructions: String(formData.get("careInstructions") ?? "").trim() || null,
        stockQuantity: stockSum,
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

export async function updateProductStock(productId: string, stockQuantity: number) {
  await requireStaff("/admin/inventory");
  const qty = Math.max(0, Math.floor(stockQuantity));
  const variantCount = await prisma.productVariant.count({ where: { productId } });
  if (variantCount > 1) {
    revalidatePath("/admin/inventory");
    return;
  }
  await prisma.$transaction(async (tx) => {
    if (variantCount === 0) {
      await tx.productVariant.create({
        data: { productId, size: "", color: "", quantity: qty }
      });
    } else {
      const v = await tx.productVariant.findFirst({ where: { productId } });
      if (v) {
        await tx.productVariant.update({
          where: { id: v.id },
          data: { quantity: qty }
        });
      }
    }
    await tx.product.update({
      where: { id: productId },
      data: { stockQuantity: qty }
    });
  });
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin/inventory");
}

export async function updateProductStockForm(formData: FormData) {
  const id = String(formData.get("productId") ?? "");
  const stock = Number(formData.get("stock") ?? 0);
  if (!id) return;
  await updateProductStock(id, stock);
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
