"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminRole, requireStaff } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import type { HomePagePayloadV1 } from "@/lib/home-page-types";

function isPayloadV1(x: unknown): x is HomePagePayloadV1 {
  return (
    typeof x === "object" &&
    x !== null &&
    "version" in x &&
    (x as { version: unknown }).version === 1 &&
    "sections" in x &&
    Array.isArray((x as { sections: unknown }).sections)
  );
}

export async function saveHomePageConfig(payload: unknown) {
  const session = await requireStaff("/admin/homepage");
  if (!isAdminRole(session.user.role)) {
    redirect("/admin");
  }
  if (!isPayloadV1(payload)) {
    throw new Error("Invalid homepage config: expected { version: 1, sections: [...] }");
  }

  await prisma.homePageConfig.upsert({
    where: { id: "default" },
    create: { id: "default", payload: payload as object },
    update: { payload: payload as object }
  });

  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/admin/homepage");
}
