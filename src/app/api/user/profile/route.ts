import { NextResponse } from "next/server";
import type { UserRow } from "@/lib/db/app-types";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import type { SavedAddress } from "@/types/profile";
import { randomId } from "@/lib/random-id";
import {
  getSupabaseUserFromRequest,
  resolveAppUserIdFromSupabaseUser,
  unauthorized
} from "@/lib/supabase-server-auth";

type ProfileRow = UserRow & {
  addresses: unknown;
  deletionRequestedAt: string | Date | null;
  deletionScheduledFor: string | Date | null;
};

const KINDS = new Set(["home", "work", "other"]);

function normalizeAddresses(raw: unknown): SavedAddress[] {
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
  return out;
}

export async function GET(req: Request) {
  const user = await getSupabaseUserFromRequest(req);
  if (!user) return unauthorized();
  const userId = await resolveAppUserIdFromSupabaseUser(user);
  if (!userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = getSupabaseServiceRoleClient();
  const { data: u, error } = await supabase
    .from("User")
    .select("name,email,phone,addresses,deletionRequestedAt,deletionScheduledFor")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (error || !u) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    name: u.name ?? "",
    email: u.email ?? "",
    phone: u.phone ?? "",
    addresses: Array.isArray(u.addresses) ? u.addresses : [],
    deletionRequestedAt: u.deletionRequestedAt ? new Date(u.deletionRequestedAt).toISOString() : null,
    deletionScheduledFor: u.deletionScheduledFor ? new Date(u.deletionScheduledFor).toISOString() : null
  });
}

export async function POST(req: Request) {
  const user = await getSupabaseUserFromRequest(req);
  if (!user) return unauthorized();

  const email = user.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Supabase user has no email." }, { status: 400 });

  const supabase = getSupabaseServiceRoleClient();
  const existingUserId = await resolveAppUserIdFromSupabaseUser(user);
  const targetId = existingUserId ?? user.id;
  const metaName =
    typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()
      ? user.user_metadata.name.trim()
      : null;
  const fallbackName = email.split("@")[0] ?? "Customer";
  const upsert = await ((supabase
    .from("User") as any)
    .upsert(
      {
        id: targetId,
        email,
        name: metaName ?? fallbackName,
        role: "CUSTOMER",
        onboardingComplete: true
      },
      { onConflict: "id" }
    )
    .select("name,email,phone,addresses,deletionRequestedAt,deletionScheduledFor")
    .single());
  if (upsert.error) {
    return NextResponse.json({ error: "Failed to sync profile" }, { status: 500 });
  }
  const u = upsert.data as ProfileRow;

  return NextResponse.json({
    name: u.name ?? "",
    email: u.email ?? "",
    phone: u.phone ?? "",
    addresses: Array.isArray(u.addresses) ? u.addresses : [],
    deletionRequestedAt: u.deletionRequestedAt ? new Date(u.deletionRequestedAt).toISOString() : null,
    deletionScheduledFor: u.deletionScheduledFor ? new Date(u.deletionScheduledFor).toISOString() : null
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
    addresses?: unknown;
  };

  const data: Record<string, unknown> = {};

  if (body.name !== undefined) {
    data.name = body.name.trim() || null;
  }
  if (body.phone !== undefined) {
    data.phone = body.phone === null || body.phone === "" ? null : String(body.phone).trim();
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

  const updated = await (getSupabaseServiceRoleClient().from("User") as any).update(data).eq("id", userId);
  if (updated.error) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
