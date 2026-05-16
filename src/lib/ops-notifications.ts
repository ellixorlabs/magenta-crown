import type { SupabaseClient } from "@supabase/supabase-js";
import { randomId } from "@/lib/random-id";
import { ROLE } from "@/lib/admin-permissions";

export type StaffNotificationInput = {
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  actionUrl?: string | null;
  recipientRole?: string | null;
};

async function merchStaffUserIds(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await (supabase.from("User") as any)
    .select("id")
    .in("role", [ROLE.ADMIN, ROLE.SUB_ADMIN]);
  if (error) {
    console.error("[ops-notifications] merchStaffUserIds", error.message);
    return [];
  }
  return ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
}

async function merchAndTechUserIds(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await (supabase.from("User") as any)
    .select("id")
    .in("role", [ROLE.ADMIN, ROLE.SUB_ADMIN, ROLE.TECH_SUPPORT]);
  if (error) {
    console.error("[ops-notifications] merchAndTechUserIds", error.message);
    return [];
  }
  return ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
}

export async function insertNotificationForUser(
  supabase: SupabaseClient,
  recipientUserId: string,
  input: StaffNotificationInput
): Promise<void> {
  const { error } = await (supabase.from("Notification") as any).insert({
    id: randomId(),
    type: input.type,
    title: input.title,
    message: input.message,
    metadata: input.metadata ?? {},
    isRead: false,
    recipientRole: input.recipientRole ?? null,
    recipientUserId,
    actionUrl: input.actionUrl ?? null
  });
  if (error) console.error("[ops-notifications] insert failed", error.message);
}

/** Fan-out to ADMIN + SUB_ADMIN (operational alerts). */
export async function notifyMerchAdmins(supabase: SupabaseClient, input: StaffNotificationInput): Promise<void> {
  const ids = await merchStaffUserIds(supabase);
  await Promise.all(ids.map((id) => insertNotificationForUser(supabase, id, input)));
}

/** Fan-out including TECH_SUPPORT (read-only staff still get inventory signals). */
export async function notifyInventoryStaff(supabase: SupabaseClient, input: StaffNotificationInput): Promise<void> {
  const ids = await merchAndTechUserIds(supabase);
  await Promise.all(ids.map((id) => insertNotificationForUser(supabase, id, input)));
}

export async function countUnreadNotificationsForUser(
  supabase: SupabaseClient,
  recipientUserId: string
): Promise<number> {
  const { count, error } = await (supabase.from("Notification") as any)
    .select("id", { count: "exact", head: true })
    .eq("recipientUserId", recipientUserId)
    .eq("isRead", false);
  if (error) {
    console.error("[ops-notifications] countUnread", error.message);
    return 0;
  }
  return count ?? 0;
}
