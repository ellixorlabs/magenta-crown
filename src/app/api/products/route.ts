import { jsonOk } from "@/lib/api/response";
import { listProductsForApi, normalizeListParams } from "@/services/products/product.service";

/**
 * GET /api/products — paginated catalog for web + mobile.
 * Query: page, pageSize, category, q (name search), sort=newest|price_asc|price_desc
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const params = normalizeListParams({
    page: searchParams.get("page"),
    pageSize: searchParams.get("pageSize"),
    category: searchParams.get("category"),
    q: searchParams.get("q"),
    sort: searchParams.get("sort")
  });
  const payload = await listProductsForApi(params);
  return jsonOk(payload);
}
