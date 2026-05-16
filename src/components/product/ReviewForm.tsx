"use client";

import { useState } from "react";
import type { VerifiedReviewEligibleLine } from "@/lib/review-eligibility";
import { ReviewMediaUploader } from "@/components/product/ReviewMediaUploader";

type Props = {
  productId: string;
  eligibility: VerifiedReviewEligibleLine[];
  authorNameDefault: string;
};

export function ReviewForm({ productId, eligibility, authorNameDefault }: Props) {
  const [authorName, setAuthorName] = useState(authorNameDefault);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [lineKey, setLineKey] = useState(
    eligibility.length === 1 ? `${eligibility[0]!.orderItemId}|${eligibility[0]!.orderId}` : ""
  );
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [submittedReviewId, setSubmittedReviewId] = useState<string | null>(null);

  if (eligibility.length === 0) {
    return (
      <p className="mt-6 text-sm text-zinc-500">
        Reviews can be submitted after delivery from your account when the return window is open.
      </p>
    );
  }

  return (
    <form
      className="mt-6 space-y-3 rounded-2xl border border-zinc-200 bg-white p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus("idle");
        const lk = eligibility.length === 1 ? `${eligibility[0]!.orderItemId}|${eligibility[0]!.orderId}` : lineKey;
        if (!lk) {
          setStatus("err");
          return;
        }
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, authorName, rating, body, title, lineKey: lk })
        });
        const j = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
        setStatus(res.ok ? "ok" : "err");
        if (res.ok) {
          setBody("");
          setTitle("");
          if (typeof j.id === "string") setSubmittedReviewId(j.id);
        } else {
          setSubmittedReviewId(null);
        }
      }}
    >
      <p className="text-sm font-semibold text-zinc-900">Write a review</p>
      {eligibility.length > 1 ? (
        <label className="block text-xs text-zinc-600">
          Which purchase?
          <select
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={lineKey}
            onChange={(e) => setLineKey(e.target.value)}
          >
            <option value="">Select…</option>
            {eligibility.map((l) => (
              <option key={`${l.orderItemId}|${l.orderId}`} value={`${l.orderItemId}|${l.orderId}`}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
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
      <input
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
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
      {status === "ok" && (
        <p className="text-sm text-green-700">
          Thank you — your review is pending moderation. Approved reviews appear on this page.
        </p>
      )}
      {status === "err" && <p className="text-sm text-red-600">Something went wrong.</p>}
      {submittedReviewId ? <ReviewMediaUploader reviewId={submittedReviewId} /> : null}
    </form>
  );
}
