import "server-only";

import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { prisma } from "@/lib/prisma";

export type AppRole = "ADMIN" | "SUB_ADMIN" | "CUSTOMER" | "TECH_SUPPORT";

export type AppSession = {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: AppRole;
    age: number | null;
    phone: string | null;
  };
};

export const AUTH_COOKIE = "mc-access-token";

export async function auth(): Promise<AppSession | null> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value?.trim();
  if (!token) return null;

  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) return null;

  const email = data.user.email?.trim().toLowerCase();
  const row = await prisma.user.findFirst({
    where: {
      OR: [{ id: data.user.id }, ...(email ? [{ email }] : [])]
    },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      age: true,
      phone: true,
      deletionScheduledFor: true
    }
  });
  if (!row) return null;
  if (row.deletionScheduledFor && row.deletionScheduledFor.getTime() <= Date.now()) {
    await prisma.user.delete({ where: { id: row.id } }).catch(() => null);
    return null;
  }

  return {
    user: {
      id: row.id,
      email: row.email ?? data.user.email ?? "",
      name: row.name,
      image: row.image,
      role: row.role as AppRole,
      age: row.age ?? null,
      phone: row.phone ?? null
    }
  };
}
