import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const review = await prisma.review.create({
      data: {
        productId: body.productId,
        authorName: body.authorName,
        rating: body.rating,
        title: body.title,
        body: body.body
      }
    });

    return NextResponse.json({ id: review.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not save review" }, { status: 500 });
  }
}
