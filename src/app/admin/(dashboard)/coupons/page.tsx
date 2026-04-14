import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { createCoupon, deleteCouponForm, toggleCouponForm } from "./actions";

export default async function AdminCouponsPage() {
  const session = await auth();
  if (!isAdminRole(session?.user?.role)) {
    redirect("/admin");
  }

  const coupons = await prisma.coupon.findMany({ orderBy: { code: "asc" } });

  return (
    <div className="space-y-8">
      <Link href="/admin" className="text-sm text-crown-800 underline">
        ← Admin home
      </Link>
      <h2 className="text-xl font-semibold text-zinc-900">Discount coupons</h2>
      <p className="text-sm text-zinc-600">
        Codes are matched at checkout (see cart flow). Use short uppercase codes (e.g. WELCOME10).
      </p>

      <form action={createCoupon} className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <div>
          <label className="text-xs font-semibold text-zinc-600">Code</label>
          <input name="code" required className="mt-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm uppercase" />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-600">Discount %</label>
          <input name="discountPct" type="number" step="0.1" min="1" max="100" required className="mt-1 w-24 rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked className="rounded" />
          Active
        </label>
        <button type="submit" className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
          Add coupon
        </button>
      </form>

      <ul className="space-y-2">
        {coupons.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <div>
              <span className="font-mono font-semibold">{c.code}</span>
              <span className="ml-3 text-zinc-600">{c.discountPct}% off</span>
              <span className={`ml-3 text-xs ${c.isActive ? "text-green-600" : "text-zinc-400"}`}>
                {c.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex gap-2">
              <form action={toggleCouponForm}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="next" value={String(!c.isActive)} />
                <button type="submit" className="text-xs text-crown-800 underline">
                  {c.isActive ? "Deactivate" : "Activate"}
                </button>
              </form>
              <form action={deleteCouponForm}>
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className="text-xs text-red-600 underline">
                  Delete
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
