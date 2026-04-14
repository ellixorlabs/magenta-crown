export const metadata = {
  title: "FAQs | Magenta Crown"
};

export default function FaqsPage() {
  return (
    <main className="bg-[#f8f5f6] py-12">
      <div className="section-shell max-w-3xl">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold text-zinc-900">
          Frequently asked questions
        </h1>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-900">Shipping</h2>
          <p className="mt-2 text-zinc-700">
            Domestic orders ship within 5–7 business days. Express options appear at checkout when available.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-900">Returns & exchanges</h2>
          <p className="mt-2 text-zinc-700">
            Unworn pieces with tags intact may be exchanged within 14 days. Sale items may be final—see policy.
          </p>
        </section>

        <section id="sizing" className="mt-10 scroll-mt-28">
          <h2 className="text-lg font-semibold text-zinc-900">Sizing</h2>
          <p className="mt-2 text-zinc-700">
            Each product page lists a fit note. When in doubt, choose the larger size for lehengas with corsetry; our
            stylists can guide you via WhatsApp.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-900">Payments</h2>
          <p className="mt-2 text-zinc-700">
            We accept UPI, cards, netbanking, and wallets through our payment partner (to be connected in production).
          </p>
        </section>
      </div>
    </main>
  );
}
