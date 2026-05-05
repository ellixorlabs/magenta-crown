import { redirect } from "next/navigation";
import { AuthVisualSettingsForm } from "@/components/admin/AuthVisualSettingsForm";
import { AuthMaintenanceTools } from "@/components/admin/AuthMaintenanceTools";
import { BrandAssetsSettingsForm } from "@/components/admin/BrandAssetsSettingsForm";
import { isAdminRole, requireStaff } from "@/lib/admin-auth";
import { getBrandSettings } from "@/lib/brand-settings";
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
  const shareMessageTemplate =
    typeof payload.shareMessageTemplate === "string"
      ? payload.shareMessageTemplate
      : "Hi! I found this amazing dress on Magenta Crown. Take a look: {productUrl} {couponLine}";
  const brandSettings = await getBrandSettings();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Others</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Configure global visuals used across auth and product pages.
        </p>
      </div>

      <AuthVisualSettingsForm initialUrl={authVisualImageUrl} initialSizeChartUrl={globalSizeChartImageUrl} />
      <BrandAssetsSettingsForm initial={brandSettings} initialShareTemplate={shareMessageTemplate} />
      <AuthMaintenanceTools />
    </div>
  );
}

