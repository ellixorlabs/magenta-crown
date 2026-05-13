import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { categoryLabelToSlug } from "@/lib/shop-category-url";

/**
 * In development, disable caching of HTML/RSC payloads so external browsers
 * (Chrome, Safari, mobile) don't keep stale shop/home after hot reloads.
 * Production is unchanged so normal CDN/static behavior applies.
 *
 * Next.js renamed the `middleware` file convention to `proxy` to avoid confusion with Express middleware.
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/shop") {
    const cats = searchParams.getAll("category");
    if (cats.length === 1) {
      const raw = cats[0]?.trim();
      if (raw) {
        let label: string;
        try {
          label = decodeURIComponent(raw);
        } catch {
          label = raw;
        }
        const slug = categoryLabelToSlug(label);
        if (slug) {
          const url = request.nextUrl.clone();
          url.pathname = `/shop/${slug}`;
          url.searchParams.delete("category");
          return NextResponse.redirect(url, 308);
        }
      }
    }
  }

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
