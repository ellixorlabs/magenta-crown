import {
  FULFILLMENT_STEPS,
  fulfillmentStepIndex,
  displayPaymentMethod,
  isOrderStatus,
  type OrderStatus
} from "@/lib/order-domain";

export function OrderFulfillmentTimeline({
  orderStatus,
  paymentStatus,
  paymentMethod
}: {
  orderStatus: string | null | undefined;
  paymentStatus: string | null | undefined;
  paymentMethod: string | null | undefined;
}) {
  const osRaw = orderStatus ?? "";
  const os: OrderStatus = isOrderStatus(osRaw) ? osRaw : "ORDER_PLACED";
  const stepIdx = fulfillmentStepIndex(os);
  const cancelled = os === "CANCELLED";
  const pm = paymentMethod ?? "";
  const ps = paymentStatus ?? "";

  return (
    <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-zinc-900">Fulfillment</h2>
      {cancelled ? (
        <p className="mt-3 text-sm font-medium text-zinc-700">This order was cancelled.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {FULFILLMENT_STEPS.map((step, i) => {
            const done = stepIdx >= i;
            const current = stepIdx === i;
            return (
              <li key={step.key} className="flex gap-3 text-sm">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done ? "bg-emerald-600 text-white" : "border border-zinc-200 bg-zinc-50 text-zinc-400"
                  }`}
                  aria-hidden
                >
                  {done ? "✓" : i + 1}
                </span>
                <div>
                  <p className={`font-medium ${current ? "text-crown-900" : "text-zinc-900"}`}>{step.label}</p>
                  {current ? <p className="mt-0.5 text-xs text-zinc-500">Current stage</p> : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <div className="mt-5 border-t border-zinc-100 pt-4 text-sm text-zinc-600">
        <span className="text-zinc-500">Payment: </span>
        <span className="font-medium text-zinc-800">{displayPaymentMethod(pm)}</span>
        {ps ? (
          <>
            {" "}
            <span className="text-zinc-400">·</span> <span className="text-zinc-700">{ps}</span>
          </>
        ) : null}
      </div>
      {pm === "COD" && ps === "PENDING" && !cancelled ? (
        <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-950 ring-1 ring-sky-200/80">
          Cash on delivery: payment is collected when your order is delivered.
        </p>
      ) : null}
    </div>
  );
}
