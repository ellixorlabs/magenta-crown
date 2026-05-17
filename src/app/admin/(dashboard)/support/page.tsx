import Link from "next/link";
import { requireMerchAdmin } from "@/lib/admin-auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { deleteSupportInquiry, setSupportInquiryStatus } from "./actions";

export const metadata = { title: "Support inquiries | Admin" };

type Row = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  createdAt: string;
};

export default async function AdminSupportInquiriesPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireMerchAdmin("/admin/support");
  const sp = await searchParams;
  const statusFilter = sp.status === "resolved" ? "RESOLVED" : sp.status === "open" ? "OPEN" : null;

  const supabase = getSupabaseServiceRoleClient();
  let q = (supabase.from("SupportInquiry") as any)
    .select("id,name,email,phone,message,status,createdAt")
    .order("createdAt", { ascending: false })
    .limit(100);
  if (statusFilter) q = q.eq("status", statusFilter);
  const { data, error } = await q;
  if (error && error.code !== "42P01") throw new Error(error.message);
  const rows = (data ?? []) as Row[];

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm text-crown-800 underline">
        ← Admin home
      </Link>
      <h2 className="text-xl font-semibold text-zinc-900">Support inquiries</h2>
      <div className="flex flex-wrap gap-2">
        {[
          { label: "All", href: "/admin/support" },
          { label: "Open", href: "/admin/support?status=open" },
          { label: "Resolved", href: "/admin/support?status=resolved" }
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            {t.label}
          </Link>
        ))}
      </div>
      <ul className="space-y-3">
        {rows.length === 0 ? (
          <li className="text-sm text-zinc-500">No inquiries{statusFilter ? ` (${statusFilter})` : ""}.</li>
        ) : null}
        {rows.map((r) => (
          <li key={r.id} className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-semibold text-zinc-900">{r.name}</p>
                <p className="text-xs text-zinc-500">
                  {r.email}
                  {r.phone ? ` · ${r.phone}` : ""} · {new Date(r.createdAt).toLocaleString()}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                  r.status === "RESOLVED" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
                }`}
              >
                {r.status}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-zinc-700">{r.message}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {r.status !== "RESOLVED" ? (
                <form action={setSupportInquiryStatus}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="status" value="RESOLVED" />
                  <button type="submit" className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                    Mark resolved
                  </button>
                </form>
              ) : (
                <form action={setSupportInquiryStatus}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="status" value="OPEN" />
                  <button type="submit" className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-800">
                    Reopen
                  </button>
                </form>
              )}
              <form action={deleteSupportInquiry}>
                <input type="hidden" name="id" value={r.id} />
                <button type="submit" className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 ring-1 ring-rose-200">
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
