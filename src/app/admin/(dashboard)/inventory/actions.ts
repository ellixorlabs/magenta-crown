"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeAdminImageUrl } from "@/lib/admin-image-url";
import { normColorKey, normPart } from "@/lib/product-variants";
import { randomId } from "@/lib/random-id";
import { isAdminRole, requireStaff } from "@/lib/admin-auth";
import { clearCacheByPrefix } from "@/lib/cache";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

function slugifyProductName(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"`]+/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function buildUniqueProductSlug(
  supabase: ReturnType<typeof getSupabaseServiceRoleClient>,
  preferred: string,
  productIdToExclude?: string
) {
  const base = slugifyProductName(preferred) || `product-${randomId().slice(0, 8).toLowerCase()}`;
  for (let i = 0; i < 100; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    let query = (supabase.from("Product") as any).select("id").eq("slug", candidate).limit(1);
    if (productIdToExclude) {
      query = query.neq("id", productIdToExclude);
    }
    const exists = await query.maybeSingle();
    if (exists.error) {
      throw new Error(`Unable to validate slug: ${exists.error.message}`);
    }
    if (!exists.data) return candidate;
  }
  throw new Error("Unable to generate a unique slug");
}

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

function computeNewTagExpiresAt(
  tags: string[],
  durationRaw: FormDataEntryValue | null,
  prev?: Date | null
): Date | null {
  const hasNewTag = tags.some((t) => t.trim().toLowerCase() === "new");
  if (!hasNewTag) return null;

  const duration = Number(String(durationRaw ?? "").trim());
  if (Number.isFinite(duration) && duration > 0) {
    return new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
  }

  if (prev && prev.getTime() > Date.now()) {
    return prev;
  }

  // Safe default if admin didn't provide days but kept "new" tag.
  return new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);
}

function productCommerceFields(formData: FormData) {
  const prepaidOfferText = String(formData.get("prepaidOfferText") ?? "").trim() || null;
  const pricingFootnote = String(formData.get("pricingFootnote") ?? "").trim() || null;
  return { prepaidOfferText, pricingFootnote, codEnabled: true };
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
  const tags = parseList(String(formData.get("tags") ?? ""));
  const newTagExpiresAt = computeNewTagExpiresAt(tags, formData.get("newTagDurationDays"));

  const supabase = getSupabaseServiceRoleClient();
  const slug = await buildUniqueProductSlug(supabase, slugRaw || name);
  const createProductResult = await (supabase
    .from("Product") as any)
    .insert({
      slug,
      name,
      description,
      story: String(formData.get("story") ?? "").trim() || null,
      mrp: Number.isFinite(mrp) ? mrp : 0,
      discountedPrice: discountedPrice != null && Number.isFinite(discountedPrice) ? discountedPrice : null,
      category: String(formData.get("category") ?? "Uncategorized").trim() || "Uncategorized",
      tags,
      newTagExpiresAt: newTagExpiresAt?.toISOString() ?? null,
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
    })
    .select("id,slug")
    .single();
  if (createProductResult.error) {
    throw new Error(createProductResult.error.message);
  }
  const created = createProductResult.data;

  const variantInsert = await (supabase.from("ProductVariant") as any).insert(
    variantRows.map((r) => ({
      id: randomId(),
      productId: created.id,
      size: r.size,
      color: r.color,
      stock: r.stock,
      isActive: r.isActive
    }))
  );
  if (variantInsert.error) {
    // Temporary non-atomic flow: clean up product if variants fail.
    await supabase.from("Product").delete().eq("id", created.id);
    throw new Error(`Failed to save variants: ${variantInsert.error.message}`);
  }

  if (featuredIds.length > 0) {
    const valid = await supabase.from("Coupon").select("id").in("id", featuredIds);
    const ok = new Set((((valid.data ?? []) as Array<{ id: string }>)).map((v) => v.id));
    const rows = featuredIds.filter((id) => ok.has(id)).map((couponId) => ({ productId: created.id, couponId }));
    if (rows.length > 0) {
      const couponsInsert = await (supabase
        .from("ProductFeaturedCoupon") as any)
        .upsert(rows, { onConflict: "productId,couponId" });
      if (couponsInsert.error) {
        throw new Error(couponsInsert.error.message);
      }
    }
  }

  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin/inventory");
  revalidatePath(`/product/${created.slug}`);
  // Public caches: homepage + product lists.
  clearCacheByPrefix("products");
  clearCacheByPrefix("homepage");
  redirect("/admin/inventory");
}

export async function updateProduct(formData: FormData) {
  const session = await requireStaff("/admin/inventory");
  if (session.user.role !== "ADMIN" && session.user.role !== "SUB_ADMIN") {
    throw new Error("Only staff can edit product details");
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
  const tags = parseList(String(formData.get("tags") ?? ""));
  const supabase = getSupabaseServiceRoleClient();
  const slug = await buildUniqueProductSlug(supabase, slugRaw || name, id);
  const current = await supabase
    .from("Product")
    .select("newTagExpiresAt")
    .eq("id", id)
    .maybeSingle<{ newTagExpiresAt: string | null }>();
  const newTagExpiresAt = computeNewTagExpiresAt(
    tags,
    formData.get("newTagDurationDays"),
    current.data?.newTagExpiresAt ? new Date(current.data.newTagExpiresAt) : null
  );

  // Temporary non-atomic multi-step update while Prisma transactions are being removed.
  const productUpdate = await (supabase
    .from("Product") as any)
    .update({
      slug,
      name,
      description,
      story: String(formData.get("story") ?? "").trim() || null,
      mrp: Number.isFinite(mrp) ? mrp : 0,
      discountedPrice: discountedPrice != null && Number.isFinite(discountedPrice) ? discountedPrice : null,
      category: String(formData.get("category") ?? "Uncategorized").trim() || "Uncategorized",
      tags,
      newTagExpiresAt: newTagExpiresAt?.toISOString() ?? null,
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
    })
    .eq("id", id)
    .select("slug")
    .single();
  if (productUpdate.error) {
    throw new Error(productUpdate.error.message);
  }

  const variantsDelete = await supabase.from("ProductVariant").delete().eq("productId", id);
  if (variantsDelete.error) {
    throw new Error(`Failed to replace variants: ${variantsDelete.error.message}`);
  }
  const variantsInsert = await (supabase.from("ProductVariant") as any).insert(
    variantRows.map((r) => ({
      id: randomId(),
      productId: id,
      size: r.size,
      color: r.color,
      stock: r.stock,
      isActive: r.isActive
    }))
  );
  if (variantsInsert.error) {
    throw new Error(`Failed to replace variants: ${variantsInsert.error.message}`);
  }

  const featuredDelete = await supabase.from("ProductFeaturedCoupon").delete().eq("productId", id);
  if (featuredDelete.error) {
    throw new Error(`Failed to replace featured coupons: ${featuredDelete.error.message}`);
  }
  if (featuredIds.length > 0) {
    const valid = await supabase.from("Coupon").select("id").in("id", featuredIds);
    const ok = new Set((((valid.data ?? []) as Array<{ id: string }>)).map((v) => v.id));
    const rows = featuredIds.filter((cid) => ok.has(cid)).map((couponId) => ({ productId: id, couponId }));
    if (rows.length > 0) {
      const featuredInsert = await (supabase.from("ProductFeaturedCoupon") as any).insert(rows);
      if (featuredInsert.error) {
        throw new Error(`Failed to replace featured coupons: ${featuredInsert.error.message}`);
      }
    }
  }
  const updated = productUpdate.data;

  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath(`/product/${updated.slug}`);
  revalidatePath("/admin/inventory");
  revalidatePath(`/admin/inventory/${id}`);
  // Public caches: homepage + product lists.
  clearCacheByPrefix("products");
  clearCacheByPrefix("homepage");
}

export async function deleteProduct(
  productId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await requireStaff("/admin/inventory");
  if (!isAdminRole(session.user.role)) {
    return { ok: false, message: "Only admins can delete products." };
  }
  const supabase = getSupabaseServiceRoleClient();
  const orderLines = await supabase
    .from("OrderItem")
    .select("id", { count: "exact", head: true })
    .eq("productId", productId);
  if ((orderLines.count ?? 0) > 0) {
    return {
      ok: false,
      message:
        "This product cannot be deleted because it appears on past orders. Edit the listing to take it off sale instead."
    };
  }
  try {
    const remove = await supabase.from("Product").delete().eq("id", productId);
    if (remove.error) {
      throw new Error(remove.error.message);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete failed.";
    return { ok: false, message: msg };
  }
  revalidatePath("/", "layout");
  revalidatePath("/shop");
  revalidatePath("/admin/inventory");
  // Public caches: homepage + product lists.
  clearCacheByPrefix("products");
  clearCacheByPrefix("homepage");
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
