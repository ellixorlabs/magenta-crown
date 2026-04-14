import Image from "next/image";

export const metadata = {
  title: "About Us | Magenta Crown"
};

export default function AboutPage() {
  return (
    <main className="bg-[#f8f5f6] py-12">
      <div className="section-shell max-w-3xl">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">About</p>
        <h1 className="mt-2 font-[family-name:var(--font-heading)] text-4xl font-semibold text-zinc-900">Our story</h1>
        <p className="mt-6 text-lg text-zinc-700">
          Magenta Crown was founded to bridge heirloom craft and contemporary silhouettes for the modern Indian woman.
        </p>
      </div>

      <section id="ethos" className="section-shell mt-16 max-w-3xl scroll-mt-28">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">Brand ethos</h2>
        <div className="mt-6 space-y-6 text-zinc-700">
          <p>
            <strong className="text-zinc-900">Vision.</strong> To be the house women trust for occasionwear that feels
            personal, not predictable.
          </p>
          <p>
            <strong className="text-zinc-900">Mission.</strong> To partner with ethical ateliers, invest in artisan
            wages, and deliver couture-grade finishing at a considered pace.
          </p>
          <p>
            <strong className="text-zinc-900">Values.</strong> Integrity, craft, inclusion, and transparency—from loom
            to doorstep.
          </p>
        </div>
      </section>

      <section className="section-shell mt-16 grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-zinc-200">
          <Image
            src="https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=900&q=80"
            alt="Founder portrait placeholder"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">Founder</h2>
          <p className="mt-4 text-zinc-700">
            Our founder grew up between ateliers and archives—learning that luxury is not excess, but intention. Magenta
            Crown is that promise made wearable.
          </p>
        </div>
      </section>

      <section id="craft" className="section-shell mt-16 max-w-3xl scroll-mt-28">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">
          Craftsmanship & quality
        </h2>
        <p className="mt-4 text-zinc-700">
          We work with master embroiderers and pattern-makers across India. Every piece passes multiple fittings,
          hand-finishing, and quality checks before it reaches you.
        </p>
      </section>

      <section className="section-shell mt-16 max-w-3xl border-t border-zinc-200 pt-12">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">
          Sustainability & ethics
        </h2>
        <p className="mt-4 text-zinc-700">
          Small-batch production, fair wages, and mindful packaging are non-negotiable. We publish annual impact notes as
          we deepen partnerships with women-led cooperatives.
        </p>
      </section>
    </main>
  );
}
