import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { requireMerchAdmin, requireFullAdmin } from "@/lib/admin-auth";
import { isFullAdmin } from "@/lib/admin-permissions";
import { getCanonicalSiteUrl } from "@/lib/seo";
import type { NextAppPageSearch } from "@/types/next-app";

export const metadata = { title: "Customers | Admin" };

type PageProps = NextAppPageSearch<{ q?: string; page?: string; invited?: string; inviteError?: string }>;

async function inviteUserAction(formData: FormData) {
  "use server";
  await requireFullAdmin("/admin/users");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    redirect("/admin/users?inviteError=Email%20is%20required");
  }
  const supabase = getSupabaseServiceRoleClient();
  const redirectTo = `${getCanonicalSiteUrl()}/auth/callback?next=${encodeURIComponent("/account/profile")}`;
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (error) {
    redirect(`/admin/users?inviteError=${encodeURIComponent(error.message || "Could not send invite")}`);
  }
  redirect("/admin/users?invited=1");
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  await requireMerchAdmin("/admin/users");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 30;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const invited = sp.invited === "1";
  const inviteError = (sp.inviteError ?? "").trim();
  const rolePriority = {
    ADMIN: 0,
    SUB_ADMIN: 1,
    TECH_SUPPORT: 2,
    CUSTOMER: 3
  } as const;

  const supabase = getSupabaseServiceRoleClient();
  let query = (supabase.from("User") as any)
    .select("id,email,name,phone,role,createdAt,lastLoginAt", { count: "exact" })
    .order("createdAt", { ascending: false })
    .range(from, to);
  if (q) {
    const esc = q.replace(/[%_]/g, "");
    query = query.or(`email.ilike.%${esc}%,name.ilike.%${esc}%,phone.ilike.%${esc}%`);
  }
  const { data: users, error, count } = await query;
  if (error) throw new Error(error.message);
  const rows = (users ?? []) as Array<{ id: string; email: string | null; name: string | null; phone: string | null; role: keyof typeof rolePriority; createdAt: string; lastLoginAt: string | null }>;
  const usersSorted = [...rows].sort((a, b) => {
    const roleDelta = rolePriority[a.role] - rolePriority[b.role];
    if (roleDelta !== 0) return roleDelta;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const session = await auth();
  const canInvite = isFullAdmin(session?.user.role);
  const total = count ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-600">
        Search by email, name, or phone. Open a record for orders and payment status.
      </p>
      {canInvite ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900">Invite user</h3>
          <p className="mt-1 text-xs text-zinc-600">
            Send a secure invite email to people who do not yet have an account.
          </p>
          <form action={inviteUserAction} className="mt-3 flex flex-wrap gap-2">
            <input
              type="email"
              name="email"
              required
              placeholder="customer@example.com"
              className="min-w-[220px] flex-1 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-admin-300 focus:outline-none focus:ring-2 focus:ring-admin-100"
            />
            <button
              type="submit"
              className="rounded-full bg-admin-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-admin-700"
            >
              Send invite
            </button>
          </form>
          {invited ? <p className="mt-2 text-xs text-emerald-700">Invite sent successfully.</p> : null}
          {inviteError ? <p className="mt-2 text-xs text-red-700">{inviteError}</p> : null}
        </section>
      ) : (
        <p className="text-xs text-zinc-500">Customer invites are limited to the primary admin.</p>
      )}

      <form className="flex flex-wrap gap-2" action="/admin/users" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search…"
          className="min-w-[200px] flex-1 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-admin-300 focus:outline-none focus:ring-2 focus:ring-admin-100"
        />
        <button
          type="submit"
          className="rounded-full bg-admin-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-admin-700"
        >
          Search
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200/90 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Last login</th>
              <th className="px-4 py-3 font-semibold">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                  No users match this search.
                </td>
              </tr>
            ) : (
              usersSorted.map((u) => (
                <tr key={u.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/80">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${u.id}`} className="font-medium text-admin-800 underline-offset-2 hover:underline">
                      {u.name ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{u.email ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">{u.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">{u.role}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-600">
          <span>
            Page {page} of {totalPages} · {total} users
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold hover:bg-zinc-50">
                ← Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link href={pageHref(page + 1)} className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold hover:bg-zinc-50">
                Next →
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
