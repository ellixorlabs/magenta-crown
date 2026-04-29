import Link from "next/link";

type Props = {
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  page: number;
  pageSize: number;
  totalCount: number;
};

function buildHref(basePath: string, searchParams: Record<string, string | string[] | undefined>, patch: { page: number }) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v == null) continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === "string") p.append(k, item);
      }
    } else {
      p.set(k, v);
    }
  }
  p.set("page", String(patch.page));
  const q = p.toString();
  return q ? `${basePath}?${q}` : basePath;
}

function getPageWindow(page: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  pages.add(page);
  pages.add(page - 1);
  pages.add(page + 1);
  pages.add(page - 2);
  pages.add(page + 2);

  return Array.from(pages)
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);
}

export function ShopPagination({ basePath, searchParams, page, pageSize, totalCount }: Props) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) return null;

  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;
  const window = getPageWindow(page, totalPages);

  let last = 0;
  const items: (number | "ellipsis")[] = [];
  for (const n of window) {
    if (last && n - last > 1) items.push("ellipsis");
    items.push(n);
    last = n;
  }

  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(totalCount, page * pageSize);

  return (
    <nav className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-zinc-600">
        Showing {from}–{to} of {totalCount}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {prev ? (
          <Link
            href={buildHref(basePath, searchParams, { page: prev })}
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
          >
            Prev
          </Link>
        ) : (
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-400">
            Prev
          </span>
        )}

        {items.map((it, idx) => {
          if (it === "ellipsis") {
            return (
              <span key={`e-${idx}`} className="px-2 text-sm text-zinc-500" aria-hidden>
                …
              </span>
            );
          }
          const n = it;
          const active = n === page;
          return (
            <Link
              key={n}
              href={buildHref(basePath, searchParams, { page: n })}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded-full border border-zinc-900 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm"
                  : "rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
              }
            >
              {n}
            </Link>
          );
        })}

        {next ? (
          <Link
            href={buildHref(basePath, searchParams, { page: next })}
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
          >
            Next
          </Link>
        ) : (
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-400">
            Next
          </span>
        )}
      </div>
    </nav>
  );
}

