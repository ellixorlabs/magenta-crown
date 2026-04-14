"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ChevronDown, ShoppingBag } from "lucide-react";
import { FALLBACK_MEGA, FALLBACK_PRIMARY } from "@/lib/default-nav";
import { SiteNavbarMegaMenu } from "@/components/features/SiteNavbarMegaMenu";
import { useCart } from "@/context/CartContext";

export type ServerNavLink = {
  label: string;
  href: string;
  group: string | null;
};

function buildNav(serverLinks: ServerNavLink[] | undefined) {
  if (!serverLinks?.length) {
    return {
      primary: FALLBACK_PRIMARY.map((p) => ({ label: p.label, href: p.href })),
      mega: FALLBACK_MEGA
    };
  }

  const primaryRaw = serverLinks
    .filter((l) => l.group == null || l.group === "")
    .map((l) => ({ label: l.label, href: l.href }));

  const mega: Record<string, { label: string; href: string }[]> = {};
  for (const l of serverLinks) {
    if (!l.group) continue;
    if (!mega[l.group]) mega[l.group] = [];
    mega[l.group].push({ label: l.label, href: l.href });
  }

  const megaFinal = Object.keys(mega).length ? mega : FALLBACK_MEGA;
  const megaKeys = new Set(Object.keys(megaFinal).map((k) => k.trim().toLowerCase()));
  const primaryFiltered = primaryRaw.filter((p) => !megaKeys.has(p.label.trim().toLowerCase()));

  const fallbackPrimary = FALLBACK_PRIMARY.map((p) => ({ label: p.label, href: p.href })).filter(
    (p) => !megaKeys.has(p.label.trim().toLowerCase())
  );

  return {
    primary: primaryFiltered.length ? primaryFiltered : fallbackPrimary,
    mega: megaFinal
  };
}

type Props = {
  serverLinks?: ServerNavLink[];
};

export function SiteNavbar({ serverLinks }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { items: cartItems } = useCart();
  const cartCount = cartItems.reduce((n, it) => n + it.quantity, 0);
  const [pastHero, setPastHero] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  /** Only one mega submenu open; switching triggers clears the previous immediately (no staggered timers per item). */
  const [openMegaTitle, setOpenMegaTitle] = useState<string | null>(null);
  const megaCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearMegaCloseTimer = useCallback(() => {
    if (megaCloseTimer.current) {
      clearTimeout(megaCloseTimer.current);
      megaCloseTimer.current = null;
    }
  }, []);

  const scheduleMegaClose = useCallback(() => {
    clearMegaCloseTimer();
    megaCloseTimer.current = setTimeout(() => setOpenMegaTitle(null), 120);
  }, [clearMegaCloseTimer]);

  const openMega = useCallback(
    (title: string) => {
      clearMegaCloseTimer();
      setOpenMegaTitle(title);
    },
    [clearMegaCloseTimer]
  );

  const { primary, mega } = useMemo(() => buildNav(serverLinks), [serverLinks]);
  const isHome = pathname === "/";

  const measureHero = useCallback(() => {
    if (!isHome) return;
    const el = document.getElementById("landing-hero");
    if (!el) {
      setPastHero(true);
      return;
    }
    const rect = el.getBoundingClientRect();
    setPastHero(rect.bottom < 96);
  }, [isHome]);

  useEffect(() => {
    if (!isHome) {
      setPastHero(true);
      return;
    }
    setPastHero(false);
    measureHero();
  }, [isHome, measureHero]);

  useEffect(() => {
    if (!isHome) return;
    measureHero();
    window.addEventListener("scroll", measureHero, { passive: true });
    window.addEventListener("resize", measureHero);
    return () => {
      window.removeEventListener("scroll", measureHero);
      window.removeEventListener("resize", measureHero);
    };
  }, [isHome, measureHero]);

  /** Only the homepage hero (before scroll) uses the immersive, edge-to-edge bar. */
  const immersive = isHome && !pastHero;
  const isLight = !immersive;

  const isAuthed = status === "authenticated" && !!session?.user;
  const isStaff =
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "SUB_ADMIN" ||
    session?.user?.role === "TECH_SUPPORT";

  const megaEntries = Object.entries(mega);

  const signInReturnUrl = useMemo(() => {
    if (!pathname || pathname.startsWith("/auth")) return "/";
    const q = searchParams.toString();
    return q ? `${pathname}?${q}` : pathname;
  }, [pathname, searchParams]);

  const signInHref = `/auth/signin?callbackUrl=${encodeURIComponent(signInReturnUrl)}`;

  const linkTone = isLight
    ? "text-zinc-900 hover:text-crown-900"
    : "text-white drop-shadow-md hover:text-white/90";

  const shellClass = immersive
    ? "pointer-events-auto w-full bg-transparent px-3 py-3 shadow-none sm:px-6 sm:py-3.5"
    : /* overflow-visible so mega-menus / account dropdowns aren’t clipped by the rounded panel */
      `pointer-events-auto mx-auto max-w-[min(1920px,calc(100vw-1rem))] overflow-visible rounded-2xl border shadow-lg backdrop-blur-xl transition-[background,box-shadow,border-color] duration-300 sm:max-w-[min(1920px,calc(100vw-2rem))] ${
        isLight
          ? "border-zinc-300/90 bg-gradient-to-r from-white via-zinc-50/98 to-white/95 text-zinc-900 shadow-zinc-900/10"
          : "border-white/25 bg-gradient-to-r from-white/18 via-white/10 to-zinc-900/35 text-white shadow-black/30"
      }`;

  return (
    <header
      className={
        immersive
          ? "pointer-events-none fixed left-0 right-0 top-0 z-50"
          : "pointer-events-none fixed left-0 right-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4"
      }
    >
      <div className={shellClass}>
        <div
          className={`section-shell flex items-center justify-between gap-4 ${immersive ? "py-1 sm:py-1.5" : "py-3.5 sm:py-[1.125rem]"}`}
        >
          <Link href="/" className="shrink-0 text-left">
            <span
              className={`font-site-brand block text-base font-semibold tracking-[0.22em] sm:text-lg ${
                isLight ? "text-zinc-950" : "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
              }`}
            >
              MAGENTA CROWN
            </span>
          </Link>

          <nav
            className="relative z-[1] hidden flex-1 flex-wrap items-center justify-center gap-3 overflow-visible lg:flex xl:gap-6"
            onMouseEnter={clearMegaCloseTimer}
            onMouseLeave={scheduleMegaClose}
          >
            {primary.map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={`font-[family-name:var(--font-body)] text-[11px] font-semibold uppercase tracking-[0.2em] transition ${linkTone}`}
                onMouseEnter={() => {
                  clearMegaCloseTimer();
                  setOpenMegaTitle(null);
                }}
              >
                {item.label}
              </Link>
            ))}
            {megaEntries.map(([groupTitle, links]) => (
              <SiteNavbarMegaMenu
                key={groupTitle}
                title={groupTitle}
                links={links}
                isLight={isLight}
                isOpen={openMegaTitle === groupTitle}
                onOpen={() => openMega(groupTitle)}
                onPanelPointerEnter={clearMegaCloseTimer}
              />
            ))}
          </nav>

          <div
            className={`flex min-w-0 shrink-0 flex-wrap items-center justify-end ${immersive ? "gap-2 sm:gap-3" : "gap-2 sm:gap-4 md:gap-5"}`}
          >
            {!isStaff && (
              <Link
                href="/cart"
                className={`flex items-center gap-2 rounded-lg px-2 py-2 transition active:scale-[0.98] ${linkTone}`}
              >
                <span className="relative inline-flex shrink-0">
                  <ShoppingBag className="h-6 w-6" strokeWidth={1.5} />
                  {cartCount > 0 && (
                    <span
                      className={`absolute -right-1.5 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
                        isLight ? "bg-crown-800 text-white" : "bg-white text-crown-900 shadow-sm"
                      }`}
                      aria-label={`${cartCount} items in cart`}
                    >
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </span>
                <span className="hidden font-[family-name:var(--font-body)] text-[11px] font-semibold uppercase tracking-[0.18em] sm:inline">
                  Cart
                </span>
              </Link>
            )}

            {status === "loading" ? (
              <span className={`text-xs ${isLight ? "text-zinc-500" : "text-white/80"}`}>…</span>
            ) : !isAuthed ? (
              <Link
                href={signInHref}
                className={`rounded-full px-5 py-2.5 font-[family-name:var(--font-body)] text-[11px] font-semibold uppercase tracking-[0.14em] sm:px-6 sm:py-3 sm:text-xs transition active:scale-[0.98] ${
                  isLight
                    ? "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800"
                    : "border border-white/80 bg-transparent text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)] hover:bg-white/10"
                }`}
              >
                Login
              </Link>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen((o) => !o)}
                  className={`flex items-center gap-2 rounded-full py-1 transition active:scale-[0.98] ${
                    isLight ? "text-zinc-900" : "text-white"
                  }`}
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                >
                  {session.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 rounded-full border border-white/30 object-cover"
                    />
                  ) : (
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold uppercase ${
                        isLight ? "border-zinc-300 bg-zinc-100 text-zinc-800" : "border-white/60 bg-transparent text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
                      }`}
                    >
                      {(session.user?.name ?? session.user?.email ?? "?").slice(0, 1)}
                    </span>
                  )}
                  <ChevronDown className="hidden h-4 w-4 sm:block" />
                </button>
                {accountOpen && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-[45] cursor-default"
                      aria-label="Close menu"
                      onClick={() => setAccountOpen(false)}
                    />
                    <div
                      className={`absolute right-0 z-[100] mt-2 min-w-[200px] rounded-xl border py-2 shadow-xl ${
                        isLight
                          ? "border-zinc-200 bg-white text-zinc-800"
                          : "border-white/10 bg-zinc-950 text-zinc-100"
                      }`}
                    >
                      {isStaff && (
                        <Link
                          href="/admin"
                          className="block px-4 py-2 text-sm hover:bg-black/5"
                          onClick={() => setAccountOpen(false)}
                        >
                          Admin
                        </Link>
                      )}
                      <Link
                        href="/account/profile"
                        className="block px-4 py-2 text-sm hover:bg-black/5"
                        onClick={() => setAccountOpen(false)}
                      >
                        Profile
                      </Link>
                      {!isStaff && (
                        <>
                          <Link
                            href="/account/orders"
                            className="block px-4 py-2 text-sm hover:bg-black/5"
                            onClick={() => setAccountOpen(false)}
                          >
                            Orders
                          </Link>
                          <Link
                            href="/account/wishlist"
                            className="block px-4 py-2 text-sm hover:bg-black/5"
                            onClick={() => setAccountOpen(false)}
                          >
                            Wishlist
                          </Link>
                        </>
                      )}
                      <button
                        type="button"
                        className="block w-full px-4 py-2 text-left text-sm hover:bg-black/5"
                        onClick={() => {
                          setAccountOpen(false);
                          void signOut({ callbackUrl: "/" });
                        }}
                      >
                        Log out
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          className={`flex justify-center gap-3 overflow-x-auto lg:hidden ${
            immersive
              ? "px-3 pb-3.5 pt-2"
              : isLight
                ? "border-t border-zinc-200/80 px-4 pb-3.5 pt-2"
                : "border-t border-white/15 px-4 pb-3.5 pt-2"
          }`}
        >
          {primary.map((item) => (
            <Link
              key={item.href + item.label + "m"}
              href={item.href}
              className={`whitespace-nowrap rounded-md px-2 py-1.5 font-[family-name:var(--font-body)] text-[10px] font-semibold uppercase tracking-[0.15em] ${linkTone}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
