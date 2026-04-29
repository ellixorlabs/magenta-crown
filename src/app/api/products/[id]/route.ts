import { jsonError, jsonOk } from "@/lib/api/response";
import { getProductByIdForApi } from "@/services/products/product.service";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/products/:id — full product + active variants (mobile-friendly).
 */
export async function GET(_req: Request, ctx: RouteParams) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return jsonError("BAD_REQUEST", "Missing product id", 400);
  }
  const product = await getProductByIdForApi(id.trim());
  if (!product) {
    return jsonError("NOT_FOUND", "Product not found", 404);
  }
  return jsonOk({ product });
}
