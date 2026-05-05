import { NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      productId: string;
      authorName: string;
      rating: number;
      title?: string;
      body?: string;
    };

    if (!body.productId || !body.authorName || body.rating < 1 || body.rating > 5) {
      return NextResponse.json({ error: "Invalid review" }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const { data: review, error } = await (supabase.from("Review") as any)
      .insert({
        productId: body.productId,
        authorName: body.authorName,
        rating: body.rating,
        title: body.title,
        body: body.body
      })
      .select("id")
      .single();
    if (error) {
      return NextResponse.json({ error: "Could not save review" }, { status: 500 });
    }

    return NextResponse.json({ id: review.id });
  } catch {
    console.error("[reviews] create failed");
    return NextResponse.json({ error: "Could not save review" }, { status: 500 });
  }
}
