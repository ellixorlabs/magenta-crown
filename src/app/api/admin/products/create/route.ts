import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canCreateOrDeleteProducts } from "@/lib/admin-auth";
import { normalizeAdminImageUrl } from "@/lib/admin-image-url";
import { clearCacheByPrefix } from "@/lib/cache";
import { normColorKey, normPart } from "@/lib/product-variants";
import { randomId } from "@/lib/random-id";
import { normalizeProductStatus } from "@/lib/product-status";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

function parseList(s: string) {
  return s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

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
  preferred: string
) {
  const base = slugifyProductName(preferred) || `product-${randomId().slice(0, 8).toLowerCase()}`;
  for (let i = 0; i < 100; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const exists = await (supabase.from("Product") as any).select("id").eq("slug", candidate).limit(1).maybeSingle();
    if (exists.error) {
      throw new Error(`Unable to validate slug: ${exists.error.message}`);
    }
    if (!exists.data) return candidate;
  }
  throw new Error("Unable to generate a unique slug");
}

type ParsedRow = { color: string; size: string; stock: number; isActive: boolean };
function parseVariantRows(raw: string): ParsedRow[] {
  let arr: unknown[] = [];
  try {
    const p = JSON.parse(raw || "[]");
    arr = Array.isArray(p) ? p : [];
  } catch {
    arr = [];
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
    const key = `${normColorKey(colorStored)}\t${normPart(size)}`;
    const prev = merged.get(key);
    merged.set(key, { color: colorStored, size, stock: (prev?.stock ?? 0) + stock, isActive });
  }
  if (merged.size === 0) return [{ color: "", size: "One size", stock: 0, isActive: true }];
  return [...merged.values()];
}

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !canCreateOrDeleteProducts(role)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    if (!name || !description) {
      return NextResponse.json({ success: false, message: "Name and description are required." }, { status: 400 });
    }

    const mrp = Number(formData.get("mrp"));
    if (!Number.isFinite(mrp) || mrp <= 0) {
      return NextResponse.json({ success: false, message: "Price must be greater than 0." }, { status: 400 });
    }

    const styleCode = String(formData.get("styleCode") ?? "").trim();
    if (!styleCode) {
      return NextResponse.json(
        { success: false, message: "Style code is required (warehouse / rack reference)." },
        { status: 400 }
      );
    }

    const discountedRaw = Number(formData.get("discountedPrice"));
    const discountedPrice = Number.isFinite(discountedRaw) && discountedRaw > 0 ? discountedRaw : null;

    const supabase = getSupabaseServiceRoleClient();
    const slugSeed = String(formData.get("slug") ?? "").trim() || name;
    const slug = await buildUniqueProductSlug(supabase, slugSeed);
    const tags = parseList(String(formData.get("tags") ?? ""));
    const imageUrls = parseList(String(formData.get("imageUrls") ?? "")).map(normalizeAdminImageUrl);
    const videoUrls = parseList(String(formData.get("videoUrls") ?? ""));
    const variantRows = parseVariantRows(String(formData.get("variantsJson") ?? "[]"));
    const sizeChartRaw = String(formData.get("sizeChartImageUrl") ?? "").trim();
    const sizeChartImageUrl = sizeChartRaw ? normalizeAdminImageUrl(sizeChartRaw) : null;
    const showSizeChart = String(formData.get("showSizeChart") ?? "true") !== "false";
    const searchKeywordsRaw = String(formData.get("searchKeywords") ?? "").trim();
    const searchSynonymsRaw = String(formData.get("searchSynonyms") ?? "").trim();

    let listImageIndex = Math.max(0, Math.floor(Number(formData.get("listImageIndex") ?? 0)));
    listImageIndex = imageUrls.length > 0 ? Math.min(listImageIndex, imageUrls.length - 1) : 0;

    const inserted = await (supabase.from("Product") as any)
      .insert({
        slug,
        name,
        description,
        story: String(formData.get("story") ?? "").trim() || null,
        mrp,
        discountedPrice,
        category: String(formData.get("category") ?? "Uncategorized").trim() || "Uncategorized",
        tags,
        material: String(formData.get("material") ?? "").trim() || null,
        occasion: String(formData.get("occasion") ?? "").trim() || null,
        style: String(formData.get("style") ?? "").trim() || null,
        styleCode,
        fitNotes: String(formData.get("fitNotes") ?? "").trim() || null,
        careInstructions: String(formData.get("careInstructions") ?? "").trim() || null,
        imageUrls,
        listImageIndex,
        listImagePosition: String(formData.get("listImagePosition") ?? "center").trim() || "center",
        videoUrls,
        sizeChartImageUrl,
        showSizeChart,
        searchKeywords: searchKeywordsRaw || null,
        searchSynonyms: searchSynonymsRaw || null,
        status: normalizeProductStatus(formData.get("status")),
        prepaidOfferText: String(formData.get("prepaidOfferText") ?? "").trim() || null,
        pricingFootnote: String(formData.get("pricingFootnote") ?? "").trim() || null,
        codEnabled: true
      })
      .select("id,slug")
      .single();

    if (inserted.error || !inserted.data?.id) {
      throw new Error(inserted.error?.message || "Failed to create product");
    }

    const variantsInsert = await (supabase.from("ProductVariant") as any).insert(
      variantRows.map((r) => ({
        id: randomId(),
        productId: inserted.data.id,
        size: r.size,
        color: r.color,
        stock: r.stock,
        isActive: r.isActive
      }))
    );
    if (variantsInsert.error) {
      await supabase.from("Product").delete().eq("id", inserted.data.id);
      throw new Error(variantsInsert.error.message || "Failed to create variants");
    }

    revalidatePath("/", "layout");
    revalidatePath("/");
    revalidatePath("/shop");
    revalidatePath("/admin/inventory");
    revalidatePath(`/product/${inserted.data.slug}`);
    clearCacheByPrefix("products");
    clearCacheByPrefix("homepage");

    return NextResponse.json({ success: true, productId: inserted.data.id, slug: inserted.data.slug });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("PRODUCT ERROR", e);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
