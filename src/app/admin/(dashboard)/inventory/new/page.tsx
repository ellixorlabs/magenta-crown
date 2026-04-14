import Link from "next/link";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { ProductCreateFormClient } from "../ProductCreateFormClient";

export const metadata = { title: "Add product | Admin" };

export default async function AdminNewProductPage() {
  const session = await auth();
  if (!isAdminRole(session?.user?.role)) {
    redirect("/admin/inventory");
  }

  return (
    <div className="space-y-6">
      <p className="text-sm">
        <Link href="/admin/inventory" className="text-crown-800 underline">
          ← Inventory
        </Link>
      </p>
      <ProductCreateFormClient />
    </div>
  );
}
