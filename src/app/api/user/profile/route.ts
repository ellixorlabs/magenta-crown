import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SavedAddress } from "@/types/profile";
import { randomId } from "@/lib/random-id";
import {
  getSupabaseUserFromRequest,
  resolveAppUserIdFromSupabaseUser,
  unauthorized
} from "@/lib/supabase-server-auth";

const KINDS = new Set(["home", "work", "other"]);

function normalizeAddresses(raw: unknown): Prisma.InputJsonValue {
  if (!Array.isArray(raw)) {
    throw new Error("addresses must be an array");
  }
  const out: SavedAddress[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const line1 = String(o.line1 ?? "").trim();
    const city = String(o.city ?? "").trim();
    const state = String(o.state ?? "").trim();
    const postalCode = String(o.postalCode ?? "").trim();
    if (!line1 && !city && !state && !postalCode) continue;
    const kindRaw = o.kind != null ? String(o.kind).toLowerCase().trim() : "";
    const kind = KINDS.has(kindRaw) ? (kindRaw as SavedAddress["kind"]) : undefined;
    const customLabel =
      o.customLabel != null ? String(o.customLabel).trim().slice(0, 80) || undefined : undefined;
    if (kind === "other" && !customLabel) {
      throw new Error("Other addresses need a custom name.");
    }
    out.push({
      id: typeof o.id === "string" && o.id ? o.id : randomId(),
      kind,
      customLabel: kind === "other" ? customLabel : undefined,
      label: o.label != null ? String(o.label).trim().slice(0, 80) || undefined : undefined,
      line1,
      line2: o.line2 != null ? String(o.line2).trim() || undefined : undefined,
      city,
      state,
      postalCode,
      country: o.country != null ? String(o.country).trim() || undefined : undefined,
      phone: o.phone != null ? String(o.phone).trim() || undefined : undefined
    });
  }
  const homeCount = out.filter((a) => a.kind === "home").length;
  if (homeCount > 1) {
    throw new Error("Only one home address is allowed.");
  }
  return out as unknown as Prisma.InputJsonValue;
}

export async function GET(req: Request) {
  const user = await getSupabaseUserFromRequest(req);
  if (!user) return unauthorized();
  const userId = await resolveAppUserIdFromSupabaseUser(user);
  if (!userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      phone: true,
      age: true,
      addresses: true,
      deletionRequestedAt: true,
      deletionScheduledFor: true
    }
  });

  if (!u) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    name: u.name ?? "",
    email: u.email ?? "",
    phone: u.phone ?? "",
    age: u.age ?? null,
    addresses: Array.isArray(u.addresses) ? u.addresses : [],
    deletionRequestedAt: u.deletionRequestedAt?.toISOString() ?? null,
    deletionScheduledFor: u.deletionScheduledFor?.toISOString() ?? null
  });
}

export async function POST(req: Request) {
  const user = await getSupabaseUserFromRequest(req);
  if (!user) return unauthorized();

  const email = user.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Supabase user has no email." }, { status: 400 });

  const existingUserId = await resolveAppUserIdFromSupabaseUser(user);
  const targetId = existingUserId ?? user.id;
  const u = await prisma.user.upsert({
    where: { id: targetId },
    update: {
      email,
      name:
        typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()
          ? user.user_metadata.name.trim()
          : undefined
    },
    create: {
      id: targetId,
      email,
      name:
        typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()
          ? user.user_metadata.name.trim()
          : email.split("@")[0] ?? "Customer",
      role: "CUSTOMER",
      onboardingComplete: true
    },
    select: {
      name: true,
      email: true,
      phone: true,
      age: true,
      addresses: true,
      deletionRequestedAt: true,
      deletionScheduledFor: true
    }
  });

  return NextResponse.json({
    name: u.name ?? "",
    email: u.email ?? "",
    phone: u.phone ?? "",
    age: u.age ?? null,
    addresses: Array.isArray(u.addresses) ? u.addresses : [],
    deletionRequestedAt: u.deletionRequestedAt?.toISOString() ?? null,
    deletionScheduledFor: u.deletionScheduledFor?.toISOString() ?? null
  });
}

export async function PATCH(req: Request) {
  const user = await getSupabaseUserFromRequest(req);
  if (!user) return unauthorized();
  const userId = await resolveAppUserIdFromSupabaseUser(user);
  if (!userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json()) as {
    name?: string;
    phone?: string | null;
    age?: number | null;
    addresses?: unknown;
  };

  const data: Prisma.UserUpdateInput = {};

  if (body.name !== undefined) {
    data.name = body.name.trim() || null;
  }
  if (body.phone !== undefined) {
    data.phone = body.phone === null || body.phone === "" ? null : String(body.phone).trim();
  }
  if (body.age !== undefined) {
    if (body.age === null) {
      data.age = null;
    } else if (typeof body.age === "number" && body.age >= 13 && body.age <= 120) {
      data.age = body.age;
    } else {
      return NextResponse.json({ error: "Age must be between 13 and 120, or omitted." }, { status: 400 });
    }
  }
  if (body.addresses !== undefined) {
    try {
      data.addresses = normalizeAddresses(body.addresses);
    } catch {
      return NextResponse.json({ error: "Invalid addresses payload." }, { status: 400 });
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data
  });

  return NextResponse.json({ ok: true });
}
