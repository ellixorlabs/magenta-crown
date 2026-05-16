"use client";

import { useState } from "react";

export function AuthMaintenanceTools({ show = true }: { show?: boolean }) {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runCleanup() {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/maintenance/cleanup-unverified-users", {
        method: "POST"
      });
      const data = (await res.json()) as { error?: string; scanned?: number; deleted?: number };
      if (!res.ok) {
        setMessage(data.error || "Cleanup failed.");
        return;
      }
      setMessage(`Cleanup complete. Scanned ${data.scanned ?? 0} users, deleted ${data.deleted ?? 0}.`);
    } catch {
      setMessage("Cleanup failed.");
    } finally {
      setRunning(false);
    }
  }

  if (!show) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Auth maintenance</p>
      <p className="text-sm text-zinc-600">
        Remove users who signed up but did not verify email within 24 hours.
      </p>
      <button
        type="button"
        disabled={running}
        onClick={() => void runCleanup()}
        className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
      >
        {running ? "Running cleanup..." : "Run cleanup now"}
      </button>
      {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
    </section>
  );
}

