"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProductStatus } from "@/lib/product-status";

type Props = {
  productId: string;
  productName: string;
  hasOrders: boolean;
  status: ProductStatus;
  /** ADMIN + SUB_ADMIN; TECH_SUPPORT can edit/archive but not hard-delete. */
  allowProductDelete?: boolean;
};

export function AdminInventoryActions({
  productId,
  productName,
  hasOrders,
  status,
  allowProductDelete = true
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"archive" | "delete" | null>(null);
  const [modal, setModal] = useState<null | "archive" | "cannotDelete" | "confirmDelete">(null);
  const canDelete = !hasOrders;
  const isArchived = status === "ARCHIVED";

  async function postLifecycle(action: "archive" | "delete") {
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/products/${productId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || !data.success) {
        alert(data.message ?? "Action failed.");
        return;
      }
      router.replace("/admin/inventory");
    } finally {
      setBusy(null);
      setModal(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/admin/inventory/${productId}`}
          className="inline-flex items-center rounded-lg border border-crown-300 bg-gradient-to-b from-crown-50 to-white px-3 py-1.5 text-xs font-semibold text-crown-900 shadow-sm transition hover:from-crown-100 hover:to-crown-50"
        >
          Edit
        </Link>
        <button
          type="button"
          disabled={busy != null || isArchived}
          onClick={() => setModal("archive")}
          className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isArchived ? "Archived" : "Archive"}
        </button>
        <button
          type="button"
          disabled={busy != null || !allowProductDelete}
          onClick={() => setModal(canDelete ? "confirmDelete" : "cannotDelete")}
          className="inline-flex items-center rounded-lg border border-rose-300 bg-gradient-to-b from-rose-50 to-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-sm transition hover:from-rose-100 hover:to-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
            {modal === "cannotDelete" ? (
              <>
                <h3 className="text-lg font-semibold text-zinc-900">Deletion blocked for order integrity</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-700">
                  <span className="font-semibold">{productName}</span> is referenced in past customer orders. To preserve
                  invoice history, analytics, and audit trails, this product cannot be permanently deleted.
                </p>
                <p className="mt-2 text-sm text-zinc-700">
                  Use <span className="font-semibold">Archive</span> to remove it from storefront while retaining history.
                </p>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : modal === "archive" ? (
              <>
                <h3 className="text-lg font-semibold text-zinc-900">Archive product?</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-700">
                  This removes the product from storefront and search, but keeps images, order references, and analytics intact.
                </p>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void postLifecycle("archive")}
                    disabled={busy === "archive"}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
                  >
                    {busy === "archive" ? "Archiving..." : "Archive"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-zinc-900">Delete product permanently?</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-700">
                  This action cannot be undone. Product data and media references are removed from catalog records.
                </p>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void postLifecycle("delete")}
                    disabled={busy === "delete"}
                    className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
                  >
                    {busy === "delete" ? "Deleting..." : "Delete forever"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

