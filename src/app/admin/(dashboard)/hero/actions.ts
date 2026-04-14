"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminRole, requireStaff } from "@/lib/admin-auth";
import { DEFAULT_HERO_SLIDES } from "@/lib/hero-data";
import { parseHeroTransition } from "@/lib/hero-transition";
import { prisma } from "@/lib/prisma";

async function requireHeroAdmin() {
  const session = await requireStaff("/admin/hero");
  if (!isAdminRole(session.user.role)) {
    redirect("/admin");
  }
  return session;
}

export async function saveHeroSlide(formData: FormData) {
  await requireHeroAdmin();
  const id = formData.get("id") as string | null;
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const imagePosition = String(formData.get("imagePosition") ?? "center").trim() || "center";
  const eyebrow = String(formData.get("eyebrow") ?? "").trim();
  const line1 = String(formData.get("line1") ?? "").trim();
  const accent = String(formData.get("accent") ?? "").trim();
  const sub1 = String(formData.get("sub1") ?? "").trim();
  const sub2 = String(formData.get("sub2") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? 0);

  if (!imageUrl || !line1 || !accent) {
    return;
  }

  const existingId = typeof id === "string" && id.length > 0 ? id : null;

  if (existingId) {
    await prisma.heroSlide.update({
      where: { id: existingId },
      data: { imageUrl, imagePosition, eyebrow, line1, accent, sub1, sub2, sortOrder }
    });
  } else {
    await prisma.heroSlide.create({
      data: { imageUrl, imagePosition, eyebrow, line1, accent, sub1, sub2, sortOrder }
    });
  }
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/admin/hero");
}

export async function deleteHeroSlide(formData: FormData) {
  await requireHeroAdmin();
  const id = formData.get("id") as string | null;
  if (!id) return;
  await prisma.heroSlide.delete({ where: { id } }).catch(() => {});
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/admin/hero");
}

export async function updateHeroCarouselTransition(formData: FormData) {
  await requireHeroAdmin();
  const raw = String(formData.get("transition") ?? "").trim();
  const transition = parseHeroTransition(raw);
  await prisma.heroCarouselSettings.upsert({
    where: { id: "default" },
    create: { id: "default", transition },
    update: { transition }
  });
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/admin/hero");
}

export async function seedDefaultHeroSlides() {
  await requireHeroAdmin();
  const count = await prisma.heroSlide.count();
  if (count > 0) return;
  let i = 0;
  for (const s of DEFAULT_HERO_SLIDES) {
    await prisma.heroSlide.create({
      data: {
        sortOrder: i++,
        imageUrl: s.bg,
        eyebrow: s.label,
        line1: s.line1,
        accent: s.accent,
        sub1: s.sub[0] ?? "",
        sub2: s.sub[1] ?? ""
      }
    });
  }
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/admin/hero");
}
