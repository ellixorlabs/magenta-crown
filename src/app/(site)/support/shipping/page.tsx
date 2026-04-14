export const metadata = {
  title: "Shipping Policy | Magenta Crown"
};

export default function ShippingPolicyPage() {
  return (
    <main className="bg-[#f8f5f6] py-12">
      <div className="section-shell max-w-3xl space-y-4 text-zinc-700">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold text-zinc-900">
          Shipping policy
        </h1>
        <p>
          Orders are packed within 48 hours (business days) and handed to our courier partners. Tracking is emailed once
          dispatched. International shipping may incur duties payable on delivery.
        </p>
      </div>
    </main>
  );
}
