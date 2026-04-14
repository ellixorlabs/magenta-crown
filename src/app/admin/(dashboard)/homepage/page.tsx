import { redirect } from "next/navigation";
import { isAdminRole, requireStaff } from "@/lib/admin-auth";
import { getHomePagePayload } from "@/lib/get-home-page-config";
import { HomePageEditorClient } from "./HomePageEditorClient";

export const metadata = { title: "Homepage layout | Admin" };

export default async function AdminHomepageLayoutPage() {
  const session = await requireStaff("/admin/homepage");
  if (!isAdminRole(session.user.role)) {
    redirect("/admin");
  }

  const payload = await getHomePagePayload();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Homepage layout</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Control sections, copy, images, transitions, price-range boxes, and rails. Publish to update the live site
          immediately.
        </p>
      </div>
      <HomePageEditorClient initial={payload} />
    </div>
  );
}
