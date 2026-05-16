import { RETURN_REASON_OPTIONS } from "@/lib/return-exchange-domain";
import {
  createExchangeRequestFromAccountForm,
  createReturnRequestFromAccountForm
} from "@/app/(site)/account/orders/return-exchange-actions";

type VariantOpt = { id: string; size: string; color: string };

export function OrderItemReturnExchangeForms(props: {
  publicOrderRef: string;
  orderId: string;
  orderItemId: string;
  productName: string;
  canReturn: boolean;
  canExchange: boolean;
  exchangeVariants: VariantOpt[];
}) {
  const { publicOrderRef, orderId, orderItemId, productName, canReturn, canExchange, exchangeVariants } = props;

  return (
    <div className="mt-3 space-y-3 border-t border-zinc-100 pt-3 text-sm">
      {canReturn ? (
        <form action={createReturnRequestFromAccountForm} className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 space-y-2">
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="orderItemId" value={orderItemId} />
          <input type="hidden" name="publicOrderRef" value={publicOrderRef} />
          <p className="text-xs font-semibold text-zinc-800">Request return — {productName}</p>
          <label className="block text-xs text-zinc-600">
            Reason
            <select name="reason" required className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm">
              {RETURN_REASON_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-zinc-600">
            Details (optional)
            <textarea name="description" rows={2} className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm" />
          </label>
          <label className="block text-xs text-zinc-600">
            Notes to support (optional)
            <textarea name="customerNotes" rows={2} className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm" />
          </label>
          <button type="submit" className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800">
            Submit return request
          </button>
        </form>
      ) : null}
      {canExchange && exchangeVariants.length > 0 ? (
        <form action={createExchangeRequestFromAccountForm} className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 space-y-2">
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="orderItemId" value={orderItemId} />
          <input type="hidden" name="publicOrderRef" value={publicOrderRef} />
          <p className="text-xs font-semibold text-zinc-800">Request exchange — {productName}</p>
          <label className="block text-xs text-zinc-600">
            Reason
            <select name="reason" required className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm">
              {RETURN_REASON_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-zinc-600">
            Exchange for size / variant
            <select name="requestedVariantId" required className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm">
              <option value="">Select…</option>
              {exchangeVariants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.size} · {v.color}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-zinc-600">
            Details (optional)
            <textarea name="description" rows={2} className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm" />
          </label>
          <label className="block text-xs text-zinc-600">
            Notes (optional)
            <textarea name="customerNotes" rows={2} className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm" />
          </label>
          <button type="submit" className="rounded-full border border-zinc-900 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-50">
            Submit exchange request
          </button>
        </form>
      ) : null}
    </div>
  );
}
