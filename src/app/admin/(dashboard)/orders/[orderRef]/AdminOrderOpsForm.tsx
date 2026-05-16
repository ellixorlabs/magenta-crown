import {
  EXCHANGE_STATUSES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  RETURN_STATUSES
} from "@/lib/order-domain";
import { updateAdminOrderForm } from "../actions";

type OrderOpsFields = {
  id: string;
  publicOrderRef: string | null;
  orderStatus: string;
  paymentStatus: string;
  returnStatus: string;
  exchangeStatus: string;
  trackingNumber: string | null;
  courierPartner: string | null;
  trackingUrl: string | null;
  adminNotes: string | null;
};

export function AdminOrderOpsForm({ order }: { order: OrderOpsFields }) {
  return (
    <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">Update order</h3>
      <p className="mt-1 text-xs text-zinc-500">Changes are logged on the order timeline.</p>
      <form action={updateAdminOrderForm} className="mt-4 space-y-4 text-sm">
        <input type="hidden" name="orderId" value={order.id} />
        {order.publicOrderRef ? <input type="hidden" name="publicOrderRef" value={order.publicOrderRef} /> : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-500">Order status</span>
            <select
              name="orderStatus"
              defaultValue={order.orderStatus}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-500">Payment status</span>
            <select
              name="paymentStatus"
              defaultValue={order.paymentStatus}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900"
            >
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-500">Return status</span>
            <select
              name="returnStatus"
              defaultValue={order.returnStatus}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900"
            >
              {RETURN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-500">Exchange status</span>
            <select
              name="exchangeStatus"
              defaultValue={order.exchangeStatus}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900"
            >
              {EXCHANGE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-500">Tracking number</span>
            <input
              name="trackingNumber"
              type="text"
              defaultValue={order.trackingNumber ?? ""}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-500">Courier</span>
            <input
              name="courierPartner"
              type="text"
              defaultValue={order.courierPartner ?? ""}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900"
              autoComplete="off"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500">Tracking URL</span>
          <input
            name="trackingUrl"
            type="url"
            defaultValue={order.trackingUrl ?? ""}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900"
            autoComplete="off"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500">Admin notes</span>
          <textarea
            name="adminNotes"
            rows={3}
            defaultValue={order.adminNotes ?? ""}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900"
          />
        </label>

        <button
          type="submit"
          className="rounded-full bg-admin-800 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-admin-900"
        >
          Save changes
        </button>
      </form>
    </section>
  );
}
