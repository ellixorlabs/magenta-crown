import Link from "next/link";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export default async function AdminHomePage() {
  const session = await auth();
  const admin = isAdminRole(session?.user?.role);

  const [productCount, orderCount, couponCount, navCount] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.coupon.count(),
    prisma.headerNavLink.count()
  ]);

  const revenue = await prisma.order.aggregate({
    where: { status: { in: ["PAID", "SHIPPED"] } },
    _sum: { totalAmount: true }
  });

  return (
    <div className="space-y-10">
      <p className="text-zinc-600">
        Signed in as <strong>{session?.user?.email}</strong> ({session?.user?.role}). Customers never see this area —
        only users with the <code className="rounded bg-zinc-200 px-1">ADMIN</code> or{" "}
        <code className="rounded bg-zinc-200 px-1">SUB_ADMIN</code> role in the database.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Products" value={String(productCount)} href="/admin/inventory" />
        <Stat label="Orders" value={String(orderCount)} href="/admin/orders" />
        {admin && <Stat label="Coupons" value={String(couponCount)} href="/admin/coupons" />}
        {admin && <Stat label="Nav links" value={String(navCount)} href="/admin/navigation" />}
      </div>

      {admin && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="font-semibold text-zinc-900">Revenue (paid & shipped)</h2>
          <p className="mt-2 text-3xl font-semibold text-crown-800">
            Rs {revenue._sum.totalAmount?.toFixed(0) ?? "0"}
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-6 text-sm text-amber-950">
        <strong>How to grant admin access:</strong> In Neon / Prisma Studio, set{" "}
        <code className="rounded bg-white px-1">User.role</code> to <code className="rounded bg-white px-1">ADMIN</code>{" "}
        for your account, then sign out and sign in again. Sub-admins use{" "}
        <code className="rounded bg-white px-1">SUB_ADMIN</code> (inventory stock only + no coupon/nav edits in this
        build).
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-crown-300"
    >
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900">{value}</p>
    </Link>
  );
}
