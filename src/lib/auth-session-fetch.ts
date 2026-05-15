"use client";

/** Dedupe concurrent GET /api/auth/session + absorb rapid repeat calls (Strict Mode, focus, auth bursts). */
let inflight: Promise<Response> | null = null;
let lastNetworkAt = 0;
let lastBody = "";

const SOFT_TTL_MS = 1500;

export function invalidateAuthSessionFetchCache() {
  lastBody = "";
  lastNetworkAt = 0;
}

export function fetchAuthSessionDeduped(): Promise<Response> {
  const now = Date.now();

  if (lastBody && now - lastNetworkAt < SOFT_TTL_MS) {
    return Promise.resolve(
      new Response(lastBody, {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );
  }

  if (inflight) {
    return inflight.then((r) => r.clone());
  }

  console.log("SESSION FETCH", Date.now());

  inflight = (async () => {
    try {
      const r = await fetch("/api/auth/session", { cache: "no-store" });
      const body = await r.text();
      lastNetworkAt = Date.now();
      lastBody = body;
      return new Response(body, {
        status: r.status,
        headers: { "Content-Type": "application/json" }
      });
    } finally {
      inflight = null;
    }
  })();

  return inflight.then((r) => r.clone());
}
