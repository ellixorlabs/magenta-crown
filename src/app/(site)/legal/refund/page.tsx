export const metadata = {
  title: "Refund policy",
  description: "Refund and cancellation policy for Magenta Crown orders."
};

export default function RefundPage() {
  return (
    <main className="bg-[#f8f5f6] py-12">
      <div className="section-shell max-w-3xl space-y-4 text-zinc-700">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold text-zinc-900">Refund policy</h1>
        <p>
          Refunds are issued only after returned items pass quality checks (unused, tags attached, original packaging
          intact).
        </p>
        <p>
          Once approved, refunds are processed to the original payment method within 7-10 business days. Bank timelines
          may add extra settlement time.
        </p>
        <p>
          Shipping fees, gift packaging, and expedited handling charges are non-refundable unless the return is due to a
          damaged/incorrect item.
        </p>
        <p>
          Made-to-order, customized, altered, and final-sale items are not eligible for refund unless defective on
          delivery.
        </p>
      </div>
    </main>
  );
}
