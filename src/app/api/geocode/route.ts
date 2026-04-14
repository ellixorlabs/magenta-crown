import { NextResponse } from "next/server";

/** Server-side proxy to Photon (avoids browser CORS). https://photon.komoot.io/ */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ type: "FeatureCollection", features: [] });
  }

  try {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", q);
    url.searchParams.set("limit", "10");
    url.searchParams.set("lang", "en");

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ type: "FeatureCollection", features: [] }, { status: 200 });
    }
    const data = (await res.json()) as unknown;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ type: "FeatureCollection", features: [] });
  }
}
