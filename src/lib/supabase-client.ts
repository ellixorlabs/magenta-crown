"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient | null> | null = null;

type PublicConfig = {
  url: string;
  anonKey: string;
};

async function loadRuntimeConfig(): Promise<PublicConfig | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/public/supabase-config", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { url?: string; anonKey?: string };
    if (!data.url || !data.anonKey) return null;
    return { url: data.url, anonKey: data.anonKey };
  } catch {
    return null;
  }
}

async function initClient(): Promise<SupabaseClient | null> {
  if (cached) return cached;

  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const envAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const cfg = envUrl && envAnon ? { url: envUrl, anonKey: envAnon } : await loadRuntimeConfig();
  if (!cfg) return null;

  cached = createBrowserClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  return cached;
}

export async function getSupabaseClientOrNull(): Promise<SupabaseClient | null> {
  if (cached) return cached;
  if (!initPromise) initPromise = initClient();
  const client = await initPromise;
  initPromise = null;
  return client;
}

export async function getSupabaseClient(): Promise<SupabaseClient> {
  const client = await getSupabaseClientOrNull();
  if (!client) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return client;
}

