import Link from "next/link";
import Image from "next/image";
import { requireMerchAdmin } from "@/lib/admin-auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { deleteReviewMediaAdmin, setReviewModeration } from "./actions";

type Search = { status?: string; verified?: string };

const TABS: Array<{ key: string; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "hidden", label: "Hidden" },
  { key: "all", label: "All" }
];

export default async function AdminInventoryReviewsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireMerchAdmin("/admin/inventory/reviews");
  const sp = await searchParams;
  const statusRaw = (sp.status ?? "pending").toLowerCase();
  const activeTab = TABS.some((t) => t.key === statusRaw) ? statusRaw : "pending";
  const verifiedOnly = sp.verified === "1";

  const supabase = getSupabaseServiceRoleClient();
  let q = (supabase.from("Review") as any)
    .select("*,product:Product(name,slug),media:ReviewMedia(id,type,url,thumbnailUrl)")
    .order("createdAt", { ascending: false })
    .limit(100);

  if (activeTab === "pending") q = q.eq("moderationStatus", "PENDING");
  else if (activeTab === "approved") q = q.eq("moderationStatus", "APPROVED");
  else if (activeTab === "rejected") q = q.eq("moderationStatus", "REJECTED");
  else if (activeTab === "hidden") q = q.eq("moderationStatus", "HIDDEN");

  if (verifiedOnly) q = q.eq("verifiedPurchase", true);

  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  const list = (rows ?? []) as any[];

  const tabHref = (key: string) =>
    `/admin/inventory/reviews?status=${encodeURIComponent(key)}${verifiedOnly ? "&verified=1" : ""}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-crown-800 underline">
          ← Admin home
        </Link>
        <h2 className="mt-2 text-xl font-semibold text-zinc-900">Product review moderation</h2>
        <p className="mt-1 text-sm text-zinc-600">Approve, reject, hide, or remove abusive media. New reviews start as pending.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={tabHref(t.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              activeTab === t.key ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            {t.label}
          </Link>
        ))}
        <Link
          href={`/admin/inventory/reviews?status=${encodeURIComponent(activeTab)}${verifiedOnly ? "" : "&verified=1"}`}
          className={`ml-auto rounded-full px-3 py-1.5 text-xs font-semibold ${
            verifiedOnly ? "bg-emerald-900 text-white" : "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200"
          }`}
        >
          Verified purchase only
        </Link>
      </div>

      <ul className="space-y-4">
        {list.length === 0 ? <p className="text-sm text-zinc-500">No reviews in this filter.</p> : null}
        {list.map((r) => {
          const product = r.product as { name?: string; slug?: string } | null;
          const media = (r.media ?? []) as Array<{ id: string; type: string; url: string; thumbnailUrl: string | null }>;
          return (
            <li key={r.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-zinc-900">{r.authorName}</p>
                  <p className="text-xs text-zinc-500">
                    {product?.name ? (
                      <Link className="font-medium text-crown-800 hover:underline" href={`/product/${product.slug}`}>
                        {product.name}
                      </Link>
                    ) : (
                      r.productId
                    )}{" "}
                    · {r.rating}★ · <span className="uppercase">{r.moderationStatus}</span>
                    {r.verifiedPurchase ? <span className="ml-2 text-emerald-700">Verified</span> : null}
                  </p>
                  {r.title ? <p className="mt-2 text-sm font-medium text-zinc-800">{r.title}</p> : null}
                  {r.body ? <p className="mt-1 text-sm text-zinc-700">{r.body}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={setReviewModeration}>
                    <input type="hidden" name="reviewId" value={r.id} />
                    <input type="hidden" name="moderationStatus" value="APPROVED" />
                    <button type="submit" className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                      Approve
                    </button>
                  </form>
                  <form action={setReviewModeration}>
                    <input type="hidden" name="reviewId" value={r.id} />
                    <input type="hidden" name="moderationStatus" value="REJECTED" />
                    <button type="submit" className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 ring-1 ring-rose-200 hover:bg-rose-100">
                      Reject
                    </button>
                  </form>
                  <form action={setReviewModeration}>
                    <input type="hidden" name="reviewId" value={r.id} />
                    <input type="hidden" name="moderationStatus" value="HIDDEN" />
                    <button type="submit" className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-200">
                      Hide
                    </button>
                  </form>
                </div>
              </div>

              {media.length > 0 ? (
                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Media</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {media.map((m) => (
                      <div key={m.id} className="relative h-20 w-20 overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50">
                        {m.type === "IMAGE" ? (
                          <Image src={m.thumbnailUrl || m.url} alt="" fill className="object-cover" sizes="80px" unoptimized />
                        ) : (
                          <video src={m.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                        )}
                        <form action={deleteReviewMediaAdmin} className="absolute right-0.5 top-0.5">
                          <input type="hidden" name="reviewId" value={r.id} />
                          <input type="hidden" name="mediaId" value={m.id} />
                          <button
                            type="submit"
                            className="rounded bg-black/70 px-1.5 text-[10px] font-bold text-white"
                            title="Delete media"
                          >
                            ×
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
