"use client";

import { useState } from "react";

type Props = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

export function NewsletterSection({ eyebrow, title, subtitle }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok">("idle");

  return (
    <section className="section-shell pb-20">
      <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-12 text-center sm:px-12">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">{eyebrow}</p>
        <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">{title}</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-zinc-600">{subtitle}</p>
        <form
          className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            setStatus("ok");
          }}
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="flex-1 rounded-full border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-crown-600"
          />
          <button
            type="submit"
            className="rounded-full bg-crown-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-crown-900"
          >
            Subscribe
          </button>
        </form>
        {status === "ok" && <p className="mt-4 text-sm text-green-700">Thank you — you&apos;re on the list.</p>}
      </div>
    </section>
  );
}
