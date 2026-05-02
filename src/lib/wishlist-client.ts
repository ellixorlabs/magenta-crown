"use client";

import { getSupabaseClientOrNull } from "@/lib/supabase-client";

/** Headers for authenticated wishlist API calls (POST JSON). */
export async function wishlistPostHeaders(): Promise<HeadersInit> {
  const supabase = await getSupabaseClientOrNull();
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

/** Headers for wishlist GET (count). */
export async function wishlistGetHeaders(): Promise<HeadersInit> {
  const supabase = await getSupabaseClientOrNull();
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
