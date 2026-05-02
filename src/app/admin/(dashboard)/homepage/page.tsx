import { redirect } from "next/navigation";
import { isAdminRole, requireStaff } from "@/lib/admin-auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { getHomePagePayload } from "@/lib/get-home-page-config";
import { HomePageEditorClient } from "./HomePageEditorClient";

export const metadata = { title: "Homepage layout | Admin" };

export default async function AdminHomepageLayoutPage() {
  const session = await requireStaff("/admin/homepage");
  if (!isAdminRole(session.user.role)) {
    redirect("/admin");
  }

  const supabase = getSupabaseServiceRoleClient();
  const [payload, catalogProducts, configMeta] = await Promise.all([
    getHomePagePayload(),
    (supabase.from("Product") as any)
      .select("id,name,slug,category")
      .order("name", { ascending: true }),
    (supabase.from("HomePageConfig") as any)
      .select("updatedAt")
      .eq("id", "default")
      .maybeSingle()
  ]);
  if (catalogProducts.error) throw new Error(catalogProducts.error.message);
  if (configMeta.error) throw new Error(configMeta.error.message);

  const editorKey = configMeta.data?.updatedAt ? new Date(configMeta.data.updatedAt).toISOString() : "default";

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold text-zinc-900">Homepage sections</h2>
        <p className="mt-1 max-w-2xl break-words text-sm leading-relaxed text-zinc-600">
          Build the storefront home from dynamic sections: each block has a title, layout (carousel or grid), and a
          hand-picked product list. Hero imagery is still managed under <strong>Homepage hero</strong>; use the toggle
          below to show or hide it on the home page.
        </p>
      </div>
      <HomePageEditorClient key={editorKey} initial={payload} catalogProducts={catalogProducts.data ?? []} />
    </div>
  );
}
