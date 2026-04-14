"use client";

import { useState } from "react";

type Props = {
  productId: string;
};

export function ReviewForm({ productId }: Props) {
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");

  return (
    <form
      className="mt-6 space-y-3 rounded-2xl border border-zinc-200 bg-white p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus("idle");
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, authorName, rating, body })
        });
        setStatus(res.ok ? "ok" : "err");
        if (res.ok) {
          setBody("");
        }
      }}
    >
      <p className="text-sm font-semibold text-zinc-900">Write a review</p>
      <input
        required
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        placeholder="Your name"
        value={authorName}
        onChange={(e) => setAuthorName(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-500">Rating</label>
        <select
          className="rounded-lg border border-zinc-300 px-2 py-1 text-sm"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <textarea
        className="min-h-[80px] w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        placeholder="Share your experience"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <button
        type="submit"
        className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
      >
        Submit
      </button>
      {status === "ok" && <p className="text-sm text-green-700">Thank you for your review.</p>}
      {status === "err" && <p className="text-sm text-red-600">Something went wrong.</p>}
    </form>
  );
}
