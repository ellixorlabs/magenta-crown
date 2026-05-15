"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  memo,
  type KeyboardEvent
} from "react";
import { createPortal } from "react-dom";
import { Loader2, Sparkles, X } from "lucide-react";
import useSWR from "swr";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";
import { resolveSearchNavigationIntent } from "@/lib/search-intent";
import { shopCategoryHref } from "@/lib/shop-category-url";

const TRENDING = ["Salwar Suits", "Co-ord Sets", "Sarees", "Blouses", "Dress Materials"] as const;

const POPULAR = [
  { label: "New arrivals", href: "/shop?sort=new&page=1" },
  { label: "Shop all", href: "/shop?page=1" },
  { label: "Categories", href: "/categories" },
  { label: "Wishlist", href: "/account/wishlist" }
] as const;

const RECENT_KEY = "mc-recent-searches-v1";
const RECENT_MAX = 8;

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

function formatInr(n: number) {
  return INR.format(n);
}

type ListItem = {
  id: string;
  slug: string;
  name: string;
  mrp: number;
  salePrice: number;
  discountPercent: number;
  primaryImageUrl: string | null;
  imageUrls?: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

let suggestionsSearchAbort: AbortController | null = null;

async function fetchJsonAbortable(url: string) {
  suggestionsSearchAbort?.abort();
  const ctrl = new AbortController();
  suggestionsSearchAbort = ctrl;
  const res = await fetch(url, { signal: ctrl.signal });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

async function fetchSuggestionsJson(url: string) {
  try {
    return await fetchJsonAbortable(url);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return { ok: true as const, products: [], categories: [], styles: [], collections: [] };
    }
    throw e;
  }
}

function parseListPayload(json: unknown): { items: ListItem[] } | null {
  if (typeof json !== "object" || json === null) return null;
  const data = (json as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return null;
  const items = (data as { items?: unknown }).items;
  if (!Array.isArray(items)) return null;
  const out: ListItem[] = [];
  for (const row of items) {
    if (typeof row !== "object" || row === null) continue;
    const r = row as Record<string, unknown>;
    if (typeof r.slug !== "string" || typeof r.name !== "string") continue;
    if (typeof r.id !== "string" && typeof r.id !== "number") continue;
    const id = String(r.id);
    const mrp = typeof r.mrp === "number" ? r.mrp : Number(r.mrp);
    const salePrice = typeof r.salePrice === "number" ? r.salePrice : Number(r.salePrice);
    const discountPercent =
      typeof r.discountPercent === "number" ? r.discountPercent : Number(r.discountPercent);
    if (!Number.isFinite(mrp) || !Number.isFinite(salePrice)) continue;
    const urls = Array.isArray(r.imageUrls) ? r.imageUrls.filter((u): u is string => typeof u === "string") : [];
    out.push({
      id,
      slug: r.slug,
      name: r.name,
      mrp,
      salePrice,
      discountPercent: Number.isFinite(discountPercent) ? discountPercent : 0,
      primaryImageUrl: typeof r.primaryImageUrl === "string" ? r.primaryImageUrl : null,
      imageUrls: urls.slice(0, 4)
    });
  }
  return { items: out };
}

function parseSearchSuggestions(json: unknown): {
  products: ListItem[];
  categories: string[];
  styles: string[];
  collections: { label: string; href: string }[];
} | null {
  if (typeof json !== "object" || json === null) return null;
  const o = json as Record<string, unknown>;
  if (o.ok !== true) return null;
  const categories = Array.isArray(o.categories) ? o.categories.filter((c): c is string => typeof c === "string") : [];
  const styles = Array.isArray(o.styles) ? o.styles.filter((c): c is string => typeof c === "string") : [];
  const collections = Array.isArray(o.collections)
    ? o.collections
        .filter((x): x is { label: string; href: string } => {
          if (typeof x !== "object" || x === null) return false;
          const r = x as Record<string, unknown>;
          return typeof r.label === "string" && typeof r.href === "string";
        })
        .map((x) => ({ label: x.label, href: x.href }))
    : [];
  const rawP = o.products;
  const products: ListItem[] = [];
  if (Array.isArray(rawP)) {
    for (const row of rawP) {
      if (typeof row !== "object" || row === null) continue;
      const r = row as Record<string, unknown>;
      if (typeof r.slug !== "string" || typeof r.name !== "string") continue;
      if (typeof r.id !== "string" && typeof r.id !== "number") continue;
      const id = String(r.id);
      const mrp = typeof r.mrp === "number" ? r.mrp : Number(r.mrp);
      const salePrice = typeof r.salePrice === "number" ? r.salePrice : Number(r.salePrice);
      const discountPercent =
        typeof r.discountPercent === "number" ? r.discountPercent : Number(r.discountPercent);
      if (!Number.isFinite(mrp) || !Number.isFinite(salePrice)) continue;
      const urls = Array.isArray(r.imageUrls) ? r.imageUrls.filter((u): u is string => typeof u === "string") : [];
      products.push({
        id,
        slug: r.slug,
        name: r.name,
        mrp,
        salePrice,
        discountPercent: Number.isFinite(discountPercent) ? discountPercent : 0,
        primaryImageUrl: typeof r.primaryImageUrl === "string" ? r.primaryImageUrl : null,
        imageUrls: urls.slice(0, 4)
      });
    }
  }
  return { products, categories, styles, collections };
}

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is string => typeof x === "string").slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

function writeRecent(q: string) {
  const t = q.trim();
  if (t.length < 1) return;
  const prev = readRecent().filter((x) => x.toLowerCase() !== t.toLowerCase());
  const next = [t, ...prev].slice(0, RECENT_MAX);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

function HighlightedTitle({ text, needle }: { text: string; needle: string }) {
  const tokens = needle
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 1)
    .slice(0, 6);
  if (!tokens.length) return <span>{text}</span>;
  const esc = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`(${esc})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        tokens.some((t) => t.toLowerCase() === part.toLowerCase()) ? (
          <mark key={i} className="rounded-sm bg-amber-100/90 px-0.5 text-inherit">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function SearchProductCardInner({
  item,
  query,
  onPick,
  selected
}: {
  item: ListItem;
  query: string;
  onPick: () => void;
  selected: boolean;
}) {
  const showStrike = item.discountPercent > 0 && item.salePrice < item.mrp;
  const hoverUrl = item.imageUrls?.[1] ?? item.imageUrls?.[0] ?? item.primaryImageUrl;
  return (
    <Link
      href={`/product/${item.slug}`}
      onClick={onPick}
      prefetch
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm outline-none ring-crown-900/0 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 ${
        selected ? "border-crown-800 ring-2 ring-crown-700/30" : "border-zinc-200/90 hover:border-zinc-300"
      }`}
    >
      <div className="relative aspect-[3/4] w-full min-h-0 bg-zinc-100">
        {item.primaryImageUrl ? (
          <>
            <div className="absolute inset-0 min-h-0">
              <div className="relative h-full w-full min-h-0">
                <Image
                  src={item.primaryImageUrl}
                  alt=""
                  fill
                  className={`object-cover transition duration-500 group-hover:scale-[1.03] ${
                    hoverUrl && hoverUrl !== item.primaryImageUrl ? "group-hover:opacity-0" : ""
                  }`}
                  sizes="(max-width: 768px) 46vw, 220px"
                  loading="lazy"
                  unoptimized
                />
              </div>
            </div>
            {hoverUrl && hoverUrl !== item.primaryImageUrl ? (
              <div className="absolute inset-0 min-h-0">
                <div className="relative h-full w-full min-h-0">
                  <Image
                    src={hoverUrl}
                    alt=""
                    fill
                    className="object-cover opacity-0 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-100"
                    sizes="(max-width: 768px) 46vw, 220px"
                    loading="lazy"
                    unoptimized
                  />
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-400">No image</div>
        )}
        {item.discountPercent > 0 ? (
          <span className="absolute left-2 top-2 z-10 rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
            {item.discountPercent}% off
          </span>
        ) : null}
      </div>
      <div className="flex min-h-[5.5rem] flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-zinc-900">
          <HighlightedTitle text={item.name} needle={query} />
        </p>
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-base font-bold tabular-nums text-zinc-950">{formatInr(item.salePrice)}</span>
          {showStrike ? (
            <span className="text-sm tabular-nums text-zinc-400 line-through">{formatInr(item.mrp)}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

const SearchProductCard = memo(SearchProductCardInner);

export function SiteSearchOverlay({ open, onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [topPx, setTopPx] = useState(88);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (open) return;
    suggestionsSearchAbort?.abort();
  }, [open]);

  const { data: catJson } = useSWR(open ? "/api/public/shop-categories" : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 120_000
  });
  const categories = useMemo(() => {
    const raw = (catJson as { categories?: unknown } | undefined)?.categories;
    if (!Array.isArray(raw)) return [] as string[];
    return raw.filter((c): c is string => typeof c === "string" && c.trim().length > 0);
  }, [catJson]);

  const qForFetch = debouncedQuery;
  const fetchAutocomplete = open && qForFetch.length >= 1;

  const { data: latestJson, isLoading: loadingLatest } = useSWR(
    open && !fetchAutocomplete ? "/api/products/latest?limit=8" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000
    }
  );
  const { data: sugJson, isLoading: loadingSug } = useSWR(
    fetchAutocomplete ? `/api/public/search-suggestions?q=${encodeURIComponent(qForFetch)}` : null,
    fetchSuggestionsJson,
    { revalidateOnFocus: false, dedupingInterval: 4000, shouldRetryOnError: false }
  );

  const suggestions = useMemo(() => parseSearchSuggestions(sugJson), [sugJson]);

  const topProducts = useMemo(() => parseListPayload(latestJson)?.items ?? [], [latestJson]);
  const autocompleteItems = useMemo(() => suggestions?.products ?? [], [suggestions]);
  const gridItems = fetchAutocomplete ? autocompleteItems : topProducts;
  const gridLoading = fetchAutocomplete ? loadingSug : loadingLatest;
  const typingPending = query.trim().length > 0 && query.trim() !== debouncedQuery;

  const categorySuggestions = useMemo(() => {
    const t = debouncedQuery.trim().toLowerCase();
    if (!t || !categories.length) return [] as string[];
    return categories
      .filter((c) => c.toLowerCase().includes(t) || t.includes(c.toLowerCase().slice(0, Math.max(3, t.length))))
      .slice(0, 8);
  }, [categories, debouncedQuery]);

  const displayCategories = useMemo(
    () => (suggestions?.categories?.length ? suggestions.categories : categorySuggestions),
    [suggestions, categorySuggestions]
  );
  const displayStyles = suggestions?.styles ?? [];
  const displayCollections = suggestions?.collections ?? [];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open && typeof window !== "undefined") {
      setRecent(readRecent());
    }
  }, [open]);

  const measureHeader = useCallback(() => {
    const el =
      document.querySelector<HTMLElement>("[data-site-navbar]") ??
      document.querySelector<HTMLElement>("[data-pwa-app-navbar]");
    if (!el) return;
    setTopPx(Math.max(56, Math.ceil(el.getBoundingClientRect().bottom)));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    measureHeader();
    const onResize = () => measureHeader();
    window.addEventListener("resize", onResize);
    const el =
      document.querySelector<HTMLElement>("[data-site-navbar]") ??
      document.querySelector<HTMLElement>("[data-pwa-app-navbar]");
    const ro = el ? new ResizeObserver(() => measureHeader()) : null;
    if (el) ro?.observe(el);
    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [open, measureHeader]);

  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => {
      window.clearTimeout(t);
      unlockBodyScroll();
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebouncedQuery("");
      setActiveIndex(-1);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedQuery, gridItems.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const submit = useCallback(() => {
    const raw = query.trim();
    if (!raw) {
      onClose();
      router.push("/search");
      return;
    }
    writeRecent(raw);
    const intent = resolveSearchNavigationIntent(raw, categories);
    onClose();
    if (intent.type === "shop_category") {
      router.push(`${shopCategoryHref(intent.category)}?page=1`);
      return;
    }
    router.push(`/search?q=${encodeURIComponent(intent.q)}&page=1`);
  }, [query, categories, router, onClose]);

  const onKeyDownInput = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
      return;
    }
    if (!gridItems.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % gridItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? gridItems.length - 1 : i - 1));
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            key="search-backdrop"
            type="button"
            aria-label="Close search"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[4996] bg-zinc-950/45 backdrop-blur-[2px]"
            style={{ top: topPx }}
            onClick={onClose}
          />
          <motion.div
            key="search-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-0 z-[4997] flex flex-col bg-[#faf9f8] shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.18)]"
            style={{
              top: topPx,
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))"
            }}
          >
            <div className="border-b border-zinc-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-8">
              <div className="mx-auto flex max-w-6xl items-center gap-3">
                <div className="relative min-w-0 flex-1">
                  <Sparkles className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    ref={inputRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onKeyDownInput}
                    placeholder="Search for products…"
                    autoComplete="off"
                    className="w-full rounded-2xl border border-zinc-200/90 bg-zinc-50/90 py-3.5 pl-11 pr-12 text-base text-zinc-900 outline-none ring-crown-800/0 transition placeholder:text-zinc-400 focus:border-crown-800/40 focus:bg-white focus:ring-2 focus:ring-crown-800/15 sm:text-[15px]"
                  />
                  {(typingPending && query.trim().length >= 1) ||
                  (fetchAutocomplete && loadingSug) ||
                  (open && !fetchAutocomplete && loadingLatest) ? (
                    <Loader2 className="pointer-events-none absolute right-14 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-400" />
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50"
                  aria-label="Close search"
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-6 overflow-hidden px-4 py-5 sm:px-8 lg:flex-row">
              <aside className="flex w-full shrink-0 flex-col gap-6 overflow-y-auto border-zinc-200/80 lg:w-[280px] lg:border-r lg:pr-6">
                {suggestions?.products?.length ? (
                  <section>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Products</p>
                    <ul className="mt-2 space-y-1">
                      {suggestions.products.map((p) => (
                        <li key={p.id}>
                          <Link
                            href={`/product/${p.slug}`}
                            className="line-clamp-2 block rounded-xl px-2 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-white/80"
                            onClick={() => {
                              writeRecent(qForFetch || p.name);
                              onClose();
                            }}
                          >
                            <span className="mr-2 rounded-md bg-amber-100/90 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-zinc-800">
                              PDP
                            </span>
                            {p.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {displayCategories.length ? (
                  <section>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Categories</p>
                    <ul className="mt-2 space-y-1">
                      {displayCategories.map((c) => (
                        <li key={c}>
                          <button
                            type="button"
                            className="w-full rounded-xl px-2 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-white/80"
                            onClick={() => {
                              writeRecent(c);
                              onClose();
                              router.push(`${shopCategoryHref(c)}?page=1`);
                            }}
                          >
                            <span className="mr-2 rounded-md bg-zinc-200/80 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-zinc-700">
                              Cat
                            </span>
                            {c}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {displayStyles.length ? (
                  <section>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Styles</p>
                    <ul className="mt-2 space-y-1">
                      {displayStyles.map((s) => (
                        <li key={s}>
                          <button
                            type="button"
                            className="w-full rounded-xl px-2 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-white/80"
                            onClick={() => {
                              setQuery(s);
                            }}
                          >
                            <span className="mr-2 rounded-md bg-violet-100/90 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-violet-900">
                              Style
                            </span>
                            {s}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {displayCollections.length ? (
                  <section>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Collections</p>
                    <ul className="mt-2 space-y-1">
                      {displayCollections.map((col) => (
                        <li key={col.href}>
                          <Link
                            href={col.href}
                            className="block rounded-xl px-2 py-2 text-sm font-medium text-zinc-800 transition hover:bg-white/80"
                            onClick={() => {
                              writeRecent(col.label);
                              onClose();
                            }}
                          >
                            {col.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Trending</p>
                  <ul className="mt-2 space-y-1">
                    {TRENDING.map((label) => (
                      <li key={label}>
                        <button
                          type="button"
                          className="w-full rounded-xl px-2 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-white/80"
                          onClick={() => setQuery(label)}
                        >
                          {label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>

                {recent.length ? (
                  <section>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Recent</p>
                    <ul className="mt-2 space-y-1">
                      {recent.map((label) => (
                        <li key={label}>
                          <button
                            type="button"
                            className="w-full rounded-xl px-2 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-white/80"
                            onClick={() => setQuery(label)}
                          >
                            {label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Shortcuts</p>
                  <ul className="mt-2 space-y-1">
                    {POPULAR.map((l) => (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          className="block rounded-xl px-2 py-2 text-sm font-medium text-zinc-800 transition hover:bg-white/80"
                          onClick={onClose}
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              </aside>

              <section className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    {fetchAutocomplete ? "Suggestions" : "Top products"}
                  </h2>
                  {fetchAutocomplete ? (
                    <span className="text-xs text-zinc-500">
                      {gridLoading ? "Loading…" : `${gridItems.length} shown`}
                    </span>
                  ) : null}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
                  {gridLoading && !gridItems.length ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-zinc-200/80 bg-white">
                          <div className="aspect-[3/4] bg-zinc-200/70" />
                          <div className="space-y-2 p-3">
                            <div className="h-3 rounded bg-zinc-200/80" />
                            <div className="h-3 w-2/3 rounded bg-zinc-200/60" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : gridItems.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-zinc-200/90 bg-white/60 px-4 py-10 text-center text-sm text-zinc-600">
                      {fetchAutocomplete ? (
                        debouncedQuery.length >= 2 ? (
                          <>
                            No quick matches for <span className="font-semibold text-zinc-900">“{debouncedQuery}”</span>.
                            Try another spelling or{" "}
                            <button type="button" className="font-semibold text-crown-900 underline" onClick={() => setQuery("")}>
                              clear
                            </button>{" "}
                            — full ranked results on{" "}
                            <Link href={`/search?q=${encodeURIComponent(debouncedQuery)}&page=1`} className="font-semibold text-crown-900 underline" onClick={onClose}>
                              search page
                            </Link>
                            .
                          </>
                        ) : (
                          "Keep typing for more matches — or use trending / recent on the left."
                        )
                      ) : (
                        "Start typing to see suggestions."
                      )}
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {gridItems.map((item, idx) => (
                        <SearchProductCard
                          key={item.id}
                          item={item}
                          query={debouncedQuery}
                          selected={activeIndex === idx}
                          onPick={() => {
                            writeRecent(query.trim() || item.name);
                            onClose();
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
