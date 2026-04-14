"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isAdminRole, requireStaff } from "@/lib/admin-auth";

export async function createNavLink(formData: FormData) {
  const session = await requireStaff("/admin/navigation");
  if (!isAdminRole(session.user.role)) throw new Error("Admin only");

  const groupRaw = String(formData.get("group") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const href = String(formData.get("href") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? 0);

  if (!label || !href) throw new Error("Label and href required");

  await prisma.headerNavLink.create({
    data: {
      group: groupRaw || null,
      label,
      href,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      isActive: formData.get("isActive") === "on"
    }
  });
  revalidatePath("/");
  revalidatePath("/admin/navigation");
}

export async function deleteNavLink(id: string) {
  const session = await requireStaff("/admin/navigation");
  if (!isAdminRole(session.user.role)) throw new Error("Admin only");
  await prisma.headerNavLink.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/admin/navigation");
}

export async function toggleNavLink(id: string, isActive: boolean) {
  const session = await requireStaff("/admin/navigation");
  if (!isAdminRole(session.user.role)) throw new Error("Admin only");
  await prisma.headerNavLink.update({ where: { id }, data: { isActive } });
  revalidatePath("/");
  revalidatePath("/admin/navigation");
}

export async function deleteNavLinkForm(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) await deleteNavLink(id);
}

export async function toggleNavLinkForm(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "") === "true";
  if (id) await toggleNavLink(id, next);
}
