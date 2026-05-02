/**
 * Next.js 16 App Router route props.
 *
 * - In **async Server Components**: `const { slug } = await params;`
 * - In **Client Components** that receive a Promise from a parent RSC:
 *   `import { use } from "react";` then `const { slug } = use(params);`
 *
 * Do not read `params.slug` or `searchParams.get` directly without awaiting / `use()`.
 */

export type NextAppPageParams<Params extends Record<string, string> = Record<string, never>> = {
  params: Promise<Params>;
};

export type NextAppPageSearch<
  Search extends Record<string, string | string[] | undefined> = Record<string, string | string[] | undefined>
> = {
  searchParams: Promise<Search>;
};

export type NextAppPageProps<
  Params extends Record<string, string> = Record<string, never>,
  Search extends Record<string, string | string[] | undefined> = Record<string, string | string[] | undefined>
> = NextAppPageParams<Params> & NextAppPageSearch<Search>;

/** Route handlers: second argument `context.params` is a Promise in Next.js 15+. */
export type NextAppRouteContext<Params extends Record<string, string> = Record<string, string>> = {
  params: Promise<Params>;
};
