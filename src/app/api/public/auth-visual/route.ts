import { NextResponse } from "next/server";
import { getCachedAuthVisualBundle } from "@/lib/auth-visual-url";
import { pickAuthVisualUrl } from "@/lib/auth-visual-pick";

export async function GET() {
  try {
    const { payload } = await getCachedAuthVisualBundle();
    const imageUrl = pickAuthVisualUrl(payload);
    return NextResponse.json(
      { imageUrl },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400"
        }
      }
    );
  } catch {
    return NextResponse.json({ imageUrl: "" });
  }
}
