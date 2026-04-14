"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

function IconGrid({ inverted }: { inverted: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      className={inverted ? "text-white" : "text-zinc-500"}
      aria-hidden
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function IconList({ inverted }: { inverted: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      className={inverted ? "text-white" : "text-zinc-500"}
      aria-hidden
    >
      <rect x="4" y="5" width="5" height="5" rx="1.25" stroke="currentColor" strokeWidth="1.75" />
      <line x1="13" y1="6.5" x2="20" y2="6.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="13" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="4" y="14" width="5" height="5" rx="1.25" stroke="currentColor" strokeWidth="1.75" />
      <line x1="13" y1="15.5" x2="20" y2="15.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="13" y1="19" x2="18" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ShopViewToggle() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "list" ? "list" : "grid";

  function hrefFor(next: "grid" | "list") {
    const p = new URLSearchParams(searchParams.toString());
    if (next === "grid") p.delete("view");
    else p.set("view", "list");
    const q = p.toString();
    return q ? `/shop?${q}` : "/shop";
  }

  return (
    <div className="mb-5 flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Layout</span>
      <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
        <Link
          href={hrefFor("grid")}
          scroll={false}
          className={`rounded-lg p-2 transition ${
            view === "grid" ? "bg-zinc-900 text-white shadow-sm" : "hover:bg-zinc-50"
          }`}
          aria-label="Grid view"
          title="Grid view"
        >
          <IconGrid inverted={view === "grid"} />
        </Link>
        <Link
          href={hrefFor("list")}
          scroll={false}
          className={`rounded-lg p-2 transition ${
            view === "list" ? "bg-zinc-900 text-white shadow-sm" : "hover:bg-zinc-50"
          }`}
          aria-label="List view"
          title="List view"
        >
          <IconList inverted={view === "list"} />
        </Link>
      </div>
    </div>
  );
}
