"use client";

import { useState } from "react";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  return (
    <form
      className="mt-8 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <div>
        <label className="text-xs font-semibold uppercase text-zinc-500">Name</label>
        <input required className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase text-zinc-500">Email</label>
        <input required type="email" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase text-zinc-500">Message</label>
        <textarea required className="mt-1 min-h-[120px] w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
      </div>
      <button type="submit" className="rounded-full bg-crown-800 px-6 py-2 text-sm font-semibold text-white">
        Send
      </button>
      {sent && <p className="text-sm text-green-700">Thanks — our concierge will reply within 24 hours.</p>}
    </form>
  );
}
