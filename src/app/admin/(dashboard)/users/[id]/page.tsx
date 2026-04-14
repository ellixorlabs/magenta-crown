import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/admin-auth";

export const metadata = { title: "Customer | Admin" };

type PageProps = { params: Promise<{ id: string }> };

function money(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  await requireStaff("/admin/users");
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              product: { select: { name: true, slug: true } }
            }
          }
        }
      }
    }
  });

  if (!user) notFound();

  const rawAddr = user.addresses;
  const addressList: unknown[] = Array.isArray(rawAddr) ? rawAddr : rawAddr != null ? [rawAddr] : [];

  return (
    <div>
      <p className="text-sm">
        <Link href="/admin/users" className="text-crown-800 underline">
          ← Customers
        </Link>
      </p>

      <h2 className="mt-4 font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">
        {user.name ?? user.email ?? "Customer"}
      </h2>
      <p className="mt-1 text-sm text-zinc-600">{user.email}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Account</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Role</dt>
              <dd className="font-medium text-zinc-900">{user.role}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Phone</dt>
              <dd className="text-zinc-800">{user.phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Age</dt>
              <dd className="text-zinc-800">{user.age ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Last login</dt>
              <dd className="text-right text-zinc-800">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Joined</dt>
              <dd className="text-zinc-800">{new Date(user.createdAt).toLocaleString()}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Saved addresses</h3>
          {addressList.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">None on file.</p>
          ) : (
            <ul className="mt-3 space-y-3 text-sm text-zinc-800">
              {addressList.map((a, i) => (
                <li key={i} className="rounded-lg bg-zinc-50 p-3 text-xs leading-relaxed">
                  {typeof a === "object" && a !== null && "line1" in (a as object) ? (
                    <>
                      {(a as { label?: string }).label && (
                        <p className="font-semibold text-zinc-900">{(a as { label: string }).label}</p>
                      )}
                      <p>{String((a as { line1?: string }).line1 ?? "")}</p>
                      {(a as { line2?: string }).line2 ? <p>{String((a as { line2: string }).line2)}</p> : null}
                      <p>
                        {(a as { city?: string }).city}, {(a as { state?: string }).state}{" "}
                        {(a as { postalCode?: string }).postalCode}
                      </p>
                      {(a as { country?: string }).country ? <p>{String((a as { country: string }).country)}</p> : null}
                      {(a as { phone?: string }).phone ? <p className="text-zinc-600">{(a as { phone: string }).phone}</p> : null}
                    </>
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono">{JSON.stringify(a, null, 2)}</pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Order history</h3>
        {user.orders.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No orders.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {user.orders.map((o) => (
              <li key={o.id} className="rounded-lg border border-zinc-100 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-xs text-zinc-500">{o.id}</span>
                  <span className="text-sm font-semibold text-zinc-900">{money(o.totalAmount)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-600">
                  <span>
                    <span className="text-zinc-400">Order / payment: </span>
                    {o.status}
                  </span>
                  {o.paymentMethod && (
                    <span>
                      <span className="text-zinc-400">Method: </span>
                      {o.paymentMethod}
                    </span>
                  )}
                  <span>
                    <span className="text-zinc-400">Placed: </span>
                    {new Date(o.createdAt).toLocaleString()}
                  </span>
                </div>
                <ul className="mt-3 space-y-1 border-t border-zinc-100 pt-3 text-sm text-zinc-700">
                  {o.items.map((it) => (
                    <li key={it.id}>
                      {it.quantity}× {it.product.name}{" "}
                      <span className="text-zinc-500">({money(it.price)} ea.)</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
