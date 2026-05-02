import { redirect } from "next/navigation";
import { AuthVisualSettingsForm } from "@/components/admin/AuthVisualSettingsForm";
import { isAdminRole, requireStaff } from "@/lib/admin-auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export const metadata = { title: "Others | Admin" };

export default async function AdminOthersPage() {
  const session = await requireStaff("/admin/others");
  if (!isAdminRole(session.user.role)) redirect("/admin");

  const supabase = getSupabaseServiceRoleClient();
  const { data: row } = await (supabase.from("HomePageConfig") as any)
    .select("payload")
    .eq("id", "default")
    .maybeSingle();
  const payload = (row?.payload ?? {}) as Record<string, unknown>;
  const authVisualImageUrl =
    typeof payload.authVisualImageUrl === "string" ? payload.authVisualImageUrl : "";
  const globalSizeChartImageUrl =
    typeof payload.globalSizeChartImageUrl === "string" ? payload.globalSizeChartImageUrl : "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Others</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Configure global visuals used across auth and product pages.
        </p>
      </div>

      <AuthVisualSettingsForm initialUrl={authVisualImageUrl} initialSizeChartUrl={globalSizeChartImageUrl} />
    </div>
  );
}

