export const metadata = {
  title: "Shipping",
  description: "Shipping timelines, tracking, and delivery information for Magenta Crown orders."
};

export default function ShippingPolicyPage() {
  return (
    <main className="bg-[#f8f5f6] py-12">
      <div className="section-shell max-w-3xl space-y-4 text-zinc-700">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold text-zinc-900">
          Shipping policy
        </h1>
        <p>Orders are packed within 24-48 business hours and dispatched after quality checks.</p>
        <p>
          India delivery usually takes 3-7 business days after dispatch. Remote locations can take longer depending on
          courier coverage.
        </p>
        <p>
          International delivery timelines vary by destination and customs processing. Import duties/taxes, if any, are
          payable by the customer unless stated otherwise at checkout.
        </p>
        <p>
          Tracking details are shared by email and SMS once shipped. For delivery issues, contact{" "}
          <a href="mailto:care@magentacrown.com" className="text-crown-800 underline">
            care@magentacrown.com
          </a>{" "}
          with your order ID.
        </p>
      </div>
    </main>
  );
}
