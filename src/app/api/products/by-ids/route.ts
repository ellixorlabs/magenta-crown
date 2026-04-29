import { NextResponse } from "next/server";
import { getProductsByIdsForApi } from "@/services/products/product.service";

/** Legacy shape `{ products }` — hydration for cart / wishlist; logic lives in product service. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids");
  if (!idsParam) {
    return NextResponse.json({ products: [] });
  }
  const ids = idsParam.split(",").filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json({ products: [] });
  }

  const products = await getProductsByIdsForApi(ids);
  return NextResponse.json({ products });
}
