import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { createNavLink, deleteNavLinkForm, toggleNavLinkForm } from "./actions";

export default async function AdminNavigationPage() {
  const session = await auth();
  if (!isAdminRole(session?.user?.role)) {
    redirect("/admin");
  }

  const links = await prisma.headerNavLink.findMany({
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }]
  });

  return (
    <div className="space-y-8">
      <Link href="/admin" className="text-sm text-crown-800 underline">
        ← Admin home
      </Link>
      <h2 className="text-xl font-semibold text-zinc-900">Header & mega menus</h2>
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
        <strong>How it works:</strong> Leave <em>Group</em> empty for links in the main top bar (e.g. Shop all). Use the same
        group name for multiple rows to build a dropdown column (e.g. group <code className="rounded bg-white px-1">Occasions</code>{" "}
        with links Wedding, Festive…). After saving, the storefront header updates on the next page load.
      </div>

      <form action={createNavLink} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-zinc-600">Group (empty = top bar)</label>
          <input name="group" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" placeholder="Occasions" />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-600">Sort order</label>
          <input name="sortOrder" type="number" defaultValue="0" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-600">Label</label>
          <input name="label" required className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-600">Href</label>
          <input name="href" required className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" placeholder="/shop" />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="isActive" defaultChecked className="rounded" />
          Active
        </label>
        <div className="sm:col-span-2">
          <button type="submit" className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
            Add link
          </button>
        </div>
      </form>

      <ul className="space-y-2">
        {links.map((l) => (
          <li
            key={l.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm"
          >
            <div>
              <span className="font-medium">{l.label}</span>
              <span className="ml-2 font-mono text-xs text-zinc-500">{l.href}</span>
              <span className="ml-2 text-xs text-zinc-500">group: {l.group ?? "—"}</span>
              <span className={`ml-2 text-xs ${l.isActive ? "text-green-600" : "text-zinc-400"}`}>
                {l.isActive ? "on" : "off"}
              </span>
            </div>
            <div className="flex gap-2">
              <form action={toggleNavLinkForm}>
                <input type="hidden" name="id" value={l.id} />
                <input type="hidden" name="next" value={String(!l.isActive)} />
                <button type="submit" className="text-xs text-crown-800 underline">
                  Toggle
                </button>
              </form>
              <form action={deleteNavLinkForm}>
                <input type="hidden" name="id" value={l.id} />
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
