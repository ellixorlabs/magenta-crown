import { contentParagraphs } from "@/lib/brand-content";

export function LegalProse({ title, body }: { title: string; body: string }) {
  const paragraphs = contentParagraphs(body);
  return (
    <main className="bg-[#f8f5f6] py-12 md:py-16">
      <article className="section-shell max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-zinc-500">Legal</p>
        <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-zinc-900">
          {title}
        </h1>
        <div className="mt-10 space-y-5 text-[15px] leading-[1.75] text-zinc-700">
          {paragraphs.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
        </div>
      </article>
    </main>
  );
}
