import type { TestimonialQuote } from "@/lib/home-page-types";

type Props = {
  eyebrow: string;
  title: string;
  quotes: TestimonialQuote[];
};

export function TestimonialsSection({ eyebrow, title, quotes }: Props) {
  if (quotes.length === 0) return null;

  return (
    <section className="section-shell py-16">
      <div className="mb-10 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">{eyebrow}</p>
        <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900 sm:text-3xl">
          {title}
        </h2>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {quotes.map((q) => (
          <blockquote key={q.name} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-zinc-700">&ldquo;{q.text}&rdquo;</p>
            <footer className="mt-4 text-sm font-semibold text-crown-800">{q.name}</footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
