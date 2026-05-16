"use server";

import { revalidatePath } from "next/cache";
import { randomId } from "@/lib/random-id";
import { requireFullAdmin } from "@/lib/admin-auth";
import { ROLE, isAppRole } from "@/lib/admin-permissions";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export async function updateUserRoleForm(formData: FormData) {
  const session = await requireFullAdmin("/admin/users");
  const targetId = String(formData.get("userId") ?? "").trim();
  const nextRoleRaw = String(formData.get("role") ?? "").trim();

  if (!targetId || !isAppRole(nextRoleRaw)) {
    throw new Error("Invalid role update.");
  }
  if (targetId === session.user.id) {
    throw new Error("Cannot change your own role here.");
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data: target, error: te } = await (supabase.from("User") as any).select("id,role,email").eq("id", targetId).maybeSingle();
  if (te) throw new Error(te.message);
  if (!target) throw new Error("User not found.");

  const prevRole = String(target.role);
  if (prevRole === ROLE.ADMIN && nextRoleRaw !== ROLE.ADMIN) {
    const { count, error: ce } = await (supabase.from("User") as any).select("id", { count: "exact", head: true }).eq("role", ROLE.ADMIN);
    if (ce) throw new Error(ce.message);
    if ((count ?? 0) <= 1) {
      throw new Error("Cannot remove the last ADMIN account.");
    }
  }

  const { error: up } = await (supabase.from("User") as any).update({ role: nextRoleRaw }).eq("id", targetId);
  if (up) throw new Error(up.message);

  const { error: ae } = await (supabase.from("AdminAuditLog") as any).insert({
    id: randomId(),
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "USER_ROLE_UPDATE",
    targetUserId: targetId,
    payload: { from: prevRole, to: nextRoleRaw, targetEmail: target.email }
  });
  if (ae) console.error("[admin-audit] insert failed", ae.message);

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetId}`);
}
