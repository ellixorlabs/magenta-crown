"use client";

import { use } from "react";

/**
 * Client Components must not read dynamic route props synchronously.
 * When a parent Server Component passes `params` / `searchParams` as Promises, unwrap with `use()`.
 */
export function useRouteParams<T extends Record<string, string>>(promise: Promise<T>): T {
  return use(promise);
}

export function useRouteSearchParams<T extends Record<string, string | string[] | undefined>>(
  promise: Promise<T>
): T {
  return use(promise);
}
