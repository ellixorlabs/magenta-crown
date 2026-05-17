"use client";

import { useState } from "react";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-8 space-y-4 rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        const fd = new FormData(e.currentTarget);
        try {
          const res = await fetch("/api/public/support-inquiry", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: fd.get("name"),
              email: fd.get("email"),
              phone: fd.get("phone"),
              message: fd.get("message")
            })
          });
          const data = (await res.json()) as { error?: string };
          if (!res.ok) {
            setError(data.error ?? "Could not send.");
            return;
          }
          setSent(true);
          e.currentTarget.reset();
        } catch {
          setError("Could not send. Try again.");
        } finally {
          setLoading(false);
        }
      }}
    >
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Name</label>
        <input name="name" required className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm" />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Email</label>
        <input
          name="email"
          required
          type="email"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Phone (optional)</label>
        <input name="phone" type="tel" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm" />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Message</label>
        <textarea
          name="message"
          required
          className="mt-1 min-h-[120px] w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading || sent}
        className="rounded-full bg-crown-800 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-crown-900 disabled:opacity-50"
      >
        {loading ? "Sending…" : sent ? "Sent" : "Send message"}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {sent ? (
        <p className="text-sm text-emerald-800">Thank you — our concierge will reply within one business day.</p>
      ) : null}
    </form>
  );
}
