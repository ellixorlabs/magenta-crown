import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Lightweight keep-alive for serverless DB pools (e.g. Neon). */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
