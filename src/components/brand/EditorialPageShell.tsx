import type { ReactNode } from "react";

export function EditorialPageShell({
  eyebrow,
  title,
  lead,
  children
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <main className="bg-[#f8f5f6]">
      <header className="border-b border-zinc-200/80 bg-[#faf8f6]">
        <div className="section-shell max-w-3xl py-12 md:py-14">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-500">{eyebrow}</p>
          ) : null}
          <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
            {title}
          </h1>
          {lead ? (
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-700 md:text-lg">{lead}</p>
          ) : null}
        </div>
      </header>
      {children}
    </main>
  );
}
