import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSupabaseUserFromRequest, unauthorized } from "@/lib/supabase-server-auth";

export async function POST(req: Request) {
  const user = await getSupabaseUserFromRequest(req);
  if (!user) return unauthorized();

  const email = user.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Supabase user has no email" }, { status: 400 });
  }

  const metaName =
    typeof user.user_metadata?.name === "string" ? user.user_metadata.name.trim() : "";
  const fallbackName = email.split("@")[0] ?? "Customer";
  const name = metaName || fallbackName;
  const existingById = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, onboardingComplete: true }
  });
  const existingByEmail = existingById
    ? null
    : await prisma.user.findUnique({
        where: { email },
        select: { id: true, role: true, onboardingComplete: true }
      });
  const targetId = existingById?.id ?? existingByEmail?.id ?? user.id;
  const role = existingById?.role ?? existingByEmail?.role ?? "CUSTOMER";
  const onboardingComplete = existingById?.onboardingComplete ?? existingByEmail?.onboardingComplete ?? true;

  await prisma.user.upsert({
    where: { id: targetId },
    update: {
      email,
      name,
      lastLoginAt: new Date()
    },
    create: {
      id: targetId,
      email,
      name,
      role,
      onboardingComplete,
      lastLoginAt: new Date()
    }
  });

  return NextResponse.json({ ok: true });
}

