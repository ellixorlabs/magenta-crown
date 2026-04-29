import { jsonOk } from "@/lib/api/response";
import { getLatestProductsForApi } from "@/services/products/product.service";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

/**
 * GET /api/products/latest — newest products (compact list DTOs).
 * Query: limit (optional, default 12, max 50)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
  const limit = Number.isFinite(raw) ? Math.min(MAX_LIMIT, Math.max(1, raw)) : DEFAULT_LIMIT;
  const payload = await getLatestProductsForApi(limit);
  return jsonOk(payload);
}
