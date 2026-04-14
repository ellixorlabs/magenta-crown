import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/admin-auth";

export const metadata = { title: "Customers | Admin" };

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function AdminUsersPage({ searchParams }: PageProps) {
  await requireStaff("/admin/users");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } }
          ]
        }
      : undefined,
    take: q ? 50 : 30,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      createdAt: true,
      lastLoginAt: true
    }
  });

  return (
    <div>
      <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-zinc-900">Customers</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Search by email, name, or phone. Open a record for orders and payment status.
      </p>

      <form className="mt-6 flex flex-wrap gap-2" action="/admin/users" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search…"
          className="min-w-[200px] flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Search
        </button>
      </form>

      <div className="mt-8 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
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
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                  No users match this search.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/80">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${u.id}`} className="font-medium text-crown-900 underline-offset-2 hover:underline">
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
    </div>
  );
}
