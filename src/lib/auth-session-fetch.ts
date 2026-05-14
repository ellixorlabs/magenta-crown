"use client";

/** Dedupe concurrent GET /api/auth/session (Strict Mode + auth listener + mount). */
let inflightGetSession: Promise<Response> | null = null;

export function fetchAuthSessionDeduped(): Promise<Response> {
  if (!inflightGetSession) {
    const p = fetch("/api/auth/session", { cache: "no-store" });
    inflightGetSession = p;
    void p.finally(() => {
      inflightGetSession = null;
    });
  }
  return inflightGetSession;
}
