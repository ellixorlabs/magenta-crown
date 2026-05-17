import type { ReactNode } from "react";

export function EditorialSection({
  id,
  tone = "white",
  children,
  className = ""
}: {
  id?: string;
  tone?: "white" | "champagne";
  children: ReactNode;
  className?: string;
}) {
  const bg = tone === "champagne" ? "bg-[#f3efe8]" : "bg-white";
  return (
    <section id={id} className={`border-b border-zinc-200/60 ${bg} ${className}`.trim()}>
      <div className="section-shell max-w-3xl py-12 md:py-16">{children}</div>
    </section>
  );
}
