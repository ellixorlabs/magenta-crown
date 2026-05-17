import Link from "next/link";
import { requireFullAdmin } from "@/lib/admin-auth";
import { scanStorageHygiene } from "@/lib/storage-hygiene-scan";

export const metadata = { title: "Maintenance | Admin" };

export default async function AdminMaintenancePage() {
  await requireFullAdmin("/admin/maintenance");
  const report = await scanStorageHygiene();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-crown-800 underline">
          ← Admin home
        </Link>
        <h2 className="mt-2 text-xl font-semibold text-zinc-900">Storage & data hygiene</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Reference snapshot for ops. Orphan blob detection should be run against your storage bucket separately.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Product image URLs (catalog)", value: report.productImageUrls },
          { label: "Review media rows", value: report.reviewMediaUrls },
          { label: "Draft products", value: report.draftProducts },
          { label: "Email outbox pending", value: report.pendingEmailOutbox },
          { label: "Email outbox failed", value: report.failedEmailOutbox }
        ].map((c) => (
          <li key={c.label} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">{c.value}</p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-zinc-500">Scanned at {new Date(report.scannedAt).toLocaleString()}</p>
      <p className="text-sm text-zinc-600">
        Cron: <code className="rounded bg-zinc-100 px-1">GET /api/cron/process-email-outbox</code> with{" "}
        <code className="rounded bg-zinc-100 px-1">Authorization: Bearer $CRON_SECRET</code>
      </p>
    </div>
  );
}
