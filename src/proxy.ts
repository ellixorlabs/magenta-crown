import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * In development, disable caching of HTML/RSC payloads so external browsers
 * (Chrome, Safari, mobile) don't keep stale shop/home after hot reloads.
 * Production is unchanged so normal CDN/static behavior applies.
 *
 * Next.js renamed the `middleware` file convention to `proxy` to avoid confusion with Express middleware.
 */
export function proxy(_request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.next();
  }
  const res = NextResponse.next();
  res.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, max-age=0, must-revalidate"
  );
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|woff2?)$).*)"
  ]
};
