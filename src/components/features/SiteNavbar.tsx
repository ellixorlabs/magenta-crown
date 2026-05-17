"use client";

import Image from "next/image";
import Link from "next/link";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Heart, Menu, Search, ShoppingBag, X } from "lucide-react";
import { createPortal } from "react-dom";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";
import { FALLBACK_MEGA, FALLBACK_PRIMARY } from "@/lib/default-nav";
import { SiteNavbarMegaMenu } from "@/components/features/SiteNavbarMegaMenu";
import { SiteSearchOverlay } from "@/components/features/SiteSearchOverlay";
import { useCart } from "@/context/CartContext";
import { useHeroReady } from "@/context/HeroReadyContext";
import { useAuth } from "@/context/AuthContext";
import { useWishlistCount } from "@/context/WishlistContext";
import { isStaffRole } from "@/lib/admin-permissions";

type BrandMarkProps = {
  brandMarkMode?: "text" | "image";
  brandText?: string;
  brandImageUrl?: string;
  brandFontFamily?: string;
};

const SiteNavbarWishlistLink = memo(function SiteNavbarWishlistLink({ isLight }: { isLight: boolean }) {
  const { count, hydrated } = useWishlistCount();
  const showBadge = hydrated && count > 0;
  const badgeLabel = count > 99 ? "99+" : String(count);
  return (
    <Link
      href="/account/wishlist"
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center transition active:scale-[0.98] ${
        isLight ? "text-zinc-900/90 hover:text-crown-900" : "text-white hover:text-white/85"
      }`}
      aria-label={
        count > 0
          ? `Wishlist — ${count > 99 ? "99+" : count} saved items`
          : "Wishlist — view all saved items"
      }
      title="Wishlist"
    >
      <Heart className="h-6 w-6" strokeWidth={1.6} />
      {showBadge && (
        <span
          className={`absolute -right-1 -top-1 flex h-5 min-w-[1.375rem] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
            isLight ? "bg-rose-600 text-white" : "bg-white text-rose-700 shadow-sm"
          }`}
          aria-hidden
        >
          {badgeLabel}
        </span>
      )}
    </Link>
  );
});

export type ServerNavLink = {
  label: string;
  href: string;
  group: string | null;
};

/** Top-level items hidden from header (still available under Shop / mega menus). */
const HIDE_PRIMARY_LABELS = new Set(["sarees", "kurtas"]);

function filterPrimaryNav<T extends { label: string }>(items: T[]): T[] {
  return items.filter((p) => !HIDE_PRIMARY_LABELS.has(p.label.trim().toLowerCase()));
}

function buildNav(serverLinks: ServerNavLink[] | undefined) {
  if (!serverLinks?.length) {
    return {
      primary: filterPrimaryNav(FALLBACK_PRIMARY.map((p) => ({ label: p.label, href: p.href }))),
      mega: FALLBACK_MEGA
    };
  }

  const primaryRaw = filterPrimaryNav(
    serverLinks
      .filter((l) => l.group == null || l.group === "")
      .map((l) => ({ label: l.label, href: l.href }))
  );

  const mega: Record<string, { label: string; href: string }[]> = {};
  for (const l of serverLinks) {
    if (!l.group) continue;
    if (!mega[l.group]) mega[l.group] = [];
    mega[l.group].push({ label: l.label, href: l.href });
  }

  const megaFinal = Object.keys(mega).length ? mega : FALLBACK_MEGA;
  const megaKeys = new Set(Object.keys(megaFinal).map((k) => k.trim().toLowerCase()));
  const primaryFiltered = primaryRaw.filter((p) => !megaKeys.has(p.label.trim().toLowerCase()));

  const fallbackPrimary = filterPrimaryNav(
    FALLBACK_PRIMARY.map((p) => ({ label: p.label, href: p.href })).filter(
      (p) => !megaKeys.has(p.label.trim().toLowerCase())
    )
  );

  return {
    primary: primaryFiltered.length ? primaryFiltered : fallbackPrimary,
    mega: megaFinal
  };
}

type Props = {
  serverLinks?: ServerNavLink[];
  brandMark?: BrandMarkProps;
};

export const SiteNavbar = memo(function SiteNavbar({ serverLinks, brandMark }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, role, userName, userEmail, logout } = useAuth();
  const { items: cartItems, cartHydrated } = useCart();
  const { heroReady } = useHeroReady();
  const cartCount = cartItems.reduce((n, it) => n + it.quantity, 0);
  /** Avoid hydration mismatch: cart lives in localStorage; only show count after client read. */
  const showCartBadge = cartHydrated && cartCount > 0;
  const [accountOpen, setAccountOpen] = useState(false);
  const accountCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  /** Avoid session/cart UI hydration mismatch (server vs client session). */
  const [mounted, setMounted] = useState(false);
  /** On home: transparent bar over hero until user scrolls past `#landing-hero`, then floating pill. */
  const [pastHero, setPastHero] = useState(false);
  /** Only one mega submenu open; switching triggers clears the previous immediately (no staggered timers per item). */
  const [openMegaTitle, setOpenMegaTitle] = useState<string | null>(null);
  const megaCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerClosing, setDrawerClosing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setDrawerMounted(true);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (mobileMenuOpen) {
      setDrawerVisible(true);
      setDrawerClosing(false);
      return;
    }
    if (!drawerVisible) return;
    setDrawerClosing(true);
    const t = window.setTimeout(() => {
      setDrawerVisible(false);
      setDrawerClosing(false);
    }, 220);
    return () => window.clearTimeout(t);
  }, [drawerVisible, mobileMenuOpen]);

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

  /** Header cart + wishlist icons: shopping flows only (hidden on home and static pages). */
  const showCommerceIcons = useMemo(() => {
    if (!pathname) return false;
    if (pathname === "/shop" || pathname === "/categories" || pathname === "/cart") return true;
    if (pathname.startsWith("/product/")) return true;
    if (pathname.startsWith("/checkout")) return true;
    return false;
  }, [pathname]);

  /** Pixels from top: when hero bottom is above this, show floating header (aligned with nav chrome). */
  const HERO_THRESHOLD_PX = 88;
  /** Ignore measurements until hero has real layout (avoids boxed header on fresh load / streaming). */
  const MIN_HERO_HEIGHT_PX = 48;
  /** Hysteresis so small scroll/bounce at the hero fold does not flip header modes every frame (reduces jank). */
  const HERO_PAST_ENTER = HERO_THRESHOLD_PX - 40;
  const HERO_PAST_EXIT = HERO_THRESHOLD_PX + 60;

  const pastHeroLatchRef = useRef(false);
  const measureRafRef = useRef<number | null>(null);

  const measureHero = useCallback(() => {
    if (!isHome) return;
    const el = document.getElementById("landing-hero");
    // Not mounted yet (streaming) or layout not ready — stay immersive, never assume "past hero".
    if (!el) {
      pastHeroLatchRef.current = false;
      setPastHero(false);
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.height < MIN_HERO_HEIGHT_PX) {
      pastHeroLatchRef.current = false;
      setPastHero(false);
      return;
    }
    const bottom = rect.bottom;
    if (!pastHeroLatchRef.current) {
      if (bottom < HERO_PAST_ENTER) pastHeroLatchRef.current = true;
    } else if (bottom > HERO_PAST_EXIT) {
      pastHeroLatchRef.current = false;
    }
    const next = pastHeroLatchRef.current;
    setPastHero((p) => (p === next ? p : next));
  }, [isHome]);

  useLayoutEffect(() => {
    if (!isHome) {
      setPastHero(true);
      return;
    }
    pastHeroLatchRef.current = false;
    setPastHero(false);
    measureHero();
  }, [isHome, measureHero]);

  useEffect(() => {
    if (!isHome) return;

    const scheduleMeasure = () => {
      if (measureRafRef.current != null) return;
      measureRafRef.current = requestAnimationFrame(() => {
        measureRafRef.current = null;
        measureHero();
      });
    };

    scheduleMeasure();

    let ro: ResizeObserver | null = null;
    const attachRo = () => {
      const hero = document.getElementById("landing-hero");
      if (!hero || ro) return;
      ro = new ResizeObserver(() => scheduleMeasure());
      ro.observe(hero);
    };
    attachRo();

    let mo: MutationObserver | null = null;
    if (!document.getElementById("landing-hero")) {
      mo = new MutationObserver(() => {
        requestAnimationFrame(() => {
          scheduleMeasure();
          attachRo();
          if (document.getElementById("landing-hero") && mo) {
            mo.disconnect();
            mo = null;
          }
        });
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    }

    window.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure);

    return () => {
      window.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
      if (measureRafRef.current != null) {
        cancelAnimationFrame(measureRafRef.current);
        measureRafRef.current = null;
      }
      ro?.disconnect();
      mo?.disconnect();
    };
  }, [isHome, measureHero]);

  const signInReturnUrl = useMemo(() => {
    if (!pathname || pathname.startsWith("/auth")) return "/";
    const q = searchParams.toString();
    return q ? `${pathname}?${q}` : pathname;
  }, [pathname, searchParams]);

  const signInHref = `/auth/signin?callbackUrl=${encodeURIComponent(signInReturnUrl)}`;

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  const clearAccountCloseTimer = useCallback(() => {
    if (accountCloseTimer.current) {
      clearTimeout(accountCloseTimer.current);
      accountCloseTimer.current = null;
    }
  }, []);

  const scheduleAccountClose = useCallback(() => {
    clearAccountCloseTimer();
    accountCloseTimer.current = setTimeout(() => setAccountOpen(false), 260);
  }, [clearAccountCloseTimer]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onWide = () => setMobileMenuOpen(false);
    mq.addEventListener("change", onWide);
    return () => mq.removeEventListener("change", onWide);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobileMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen, closeMobileMenu]);

  useEffect(() => {
    return () => {
      if (accountCloseTimer.current) clearTimeout(accountCloseTimer.current);
    };
  }, []);

  const scrollHomeToHero = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (pathname !== "/") return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [pathname]
  );

  /**
   * Keep SSR and first client render aligned on `/`:
   * server hides chrome until hero ready; client must also hide on first paint,
   * then reveal after hydration/state settle.
   */
  if (isHome && (!mounted || !heroReady)) {
    return null;
  }

  const immersive = isHome && !pastHero;
  /** Auth uses maroon immersive shell under the bar — match home-hero dark glass, not cream “light” chrome. */
  const isLight = !immersive && !pathname?.startsWith("/auth");

  const isAuthed = isAuthenticated;
  const isStaff = isStaffRole(role);

  const megaEntries = Object.entries(mega);

  const linkTone = isLight
    ? "text-mc-ink hover:text-mc-maroon"
    : "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] hover:text-white";

  /** Same width on home in both immersive and “past hero” modes so the bar does not morph width (major scroll jank). */
  const homeBarShell =
    "mx-auto w-full max-w-[min(1920px,calc(100vw-1rem))] sm:max-w-[min(1920px,calc(100vw-2rem))] rounded-2xl";

  /**
   * Hero: transparent (immersive). Else: iOS-style “liquid glass” — low-opacity tint + heavy blur/saturation + edge highlight,
   * not an opaque white card. Dark variant keeps stronger translucency over imagery.
   */
  const shellClass = immersive
    ? `pointer-events-auto ${homeBarShell} overflow-visible border border-transparent bg-transparent px-3 py-3 shadow-none sm:px-6 sm:py-3.5`
    : `pointer-events-auto ${homeBarShell} overflow-visible transition-[background-color,border-color,box-shadow] duration-200 will-change-[backdrop-filter] ${
        isLight
          ? "border border-mc-ink/10 bg-mc-cream/78 text-mc-ink shadow-[0_12px_44px_-14px_rgba(55,28,38,0.12),inset_0_1px_0_rgba(255,255,255,0.88)] ring-1 ring-inset ring-white/55 backdrop-blur-3xl backdrop-saturate-200"
          : "border border-white/30 bg-gradient-to-br from-white/18 via-white/10 to-zinc-950/45 text-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.18)] ring-1 ring-inset ring-white/20 backdrop-blur-2xl backdrop-saturate-150"
      }`;

  const mobileDrawer =
    drawerMounted && drawerVisible ? (
      createPortal(
        <div id="site-mobile-menu" className="fixed inset-0 z-[25000] lg:hidden" role="dialog" aria-modal="true" aria-label="Site menu">
          <button
            type="button"
            className={`absolute inset-0 backdrop-blur-[2px] transition-opacity duration-200 ${drawerClosing ? "bg-black/0 opacity-0" : "bg-black/45 opacity-100"}`}
            aria-label="Close menu"
            onClick={closeMobileMenu}
          />
          <div
            className={`absolute right-0 top-0 flex h-[100dvh] w-[min(100%,22rem)] flex-col border-l border-zinc-200/90 bg-white text-zinc-900 shadow-2xl transition-all duration-200 ${
              drawerClosing ? "translate-x-4 opacity-0" : "translate-x-0 opacity-100"
            }`}
            style={{ paddingTop: "max(env(safe-area-inset-top), 0px)" }}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3">
              <span className="font-site-brand text-sm font-semibold tracking-[0.2em]">Menu</span>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-700 transition hover:bg-zinc-100"
                aria-label="Close menu"
                onClick={closeMobileMenu}
              >
                <X className="h-6 w-6" strokeWidth={2} />
              </button>
            </div>
            <nav
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
              aria-label="Site"
            >
              <ul className="space-y-0.5">
                {primary.map((item) => (
                  <li key={item.href + item.label + "drawer"}>
                    <Link
                      href={item.href}
                      className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
                      onClick={closeMobileMenu}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              {megaEntries.map(([groupTitle, links]) => (
                <div key={groupTitle} className="mt-5 border-t border-zinc-100 pt-5">
                  <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{groupTitle}</p>
                  <ul className="space-y-0.5">
                    {links.map((link) => (
                      <li key={link.href + link.label}>
                        <Link
                          href={link.href}
                          className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
                          onClick={closeMobileMenu}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
            <div className="shrink-0 border-t border-zinc-200 bg-white px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {isLoading ? (
                <p className="px-3 py-2 text-sm text-zinc-500">…</p>
              ) : !isAuthed ? (
                <Link
                  href={signInHref}
                  className="block rounded-full bg-zinc-900 py-3 text-center text-sm font-semibold text-white transition hover:bg-zinc-800"
                  onClick={closeMobileMenu}
                >
                  Login
                </Link>
              ) : (
                <div className="space-y-1">
                  {isStaff && (
                    <Link
                      href="/admin"
                      className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
                      onClick={closeMobileMenu}
                    >
                      Admin
                    </Link>
                  )}
                  <Link
                    href="/account/profile"
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
                    onClick={closeMobileMenu}
                  >
                    Profile
                  </Link>
                  {!isStaff && (
                    <>
                      <Link
                        href="/account/orders"
                        className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
                        onClick={closeMobileMenu}
                      >
                        Orders
                      </Link>
                      <Link
                        href="/account/wishlist"
                        className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
                        onClick={closeMobileMenu}
                      >
                        Wishlist
                      </Link>
                    </>
                  )}
                  <button
                    type="button"
                    className="mt-2 w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-100"
                    onClick={() => {
                      closeMobileMenu();
                      void logout().then(() => {
                        window.location.assign("/auth/signin");
                      });
                    }}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )
    ) : null;

  return (
    <>
      <header
        data-site-navbar
        className="pointer-events-none fixed left-0 right-0 top-0 z-[5000] isolate px-3 pt-3 sm:px-5 sm:pt-4"
      >
        <div className={shellClass}>
          <div
            className={`section-shell relative flex w-full flex-nowrap items-center justify-between gap-2 sm:gap-3 ${
              isHome ? "py-2 sm:py-2.5 lg:py-3" : immersive ? "py-1 sm:py-1.5" : "py-2.5 sm:py-3.5 lg:py-[1.125rem]"
            }`}
          >
            <Link href="/" className="relative z-[25] min-w-0 shrink-0 text-left" onClick={scrollHomeToHero}>
              {brandMark?.brandMarkMode === "image" && brandMark.brandImageUrl ? (
                <Image
                  src={brandMark.brandImageUrl}
                  alt={brandMark.brandText?.trim() || "Magenta Crown"}
                  width={220}
                  height={36}
                  sizes="(max-width: 640px) 140px, 220px"
                  className="h-7 w-auto max-w-[220px] object-contain sm:h-8 lg:h-9"
                  unoptimized
                />
              ) : (
                <span
                  className={`font-site-brand block whitespace-nowrap text-[11px] font-semibold leading-tight tracking-[0.16em] sm:text-base sm:tracking-[0.2em] lg:text-lg ${
                    isLight ? "text-mc-ink" : "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
                  }`}
                  style={brandMark?.brandFontFamily ? { fontFamily: brandMark.brandFontFamily } : undefined}
                >
                  {brandMark?.brandText?.trim() || "MAGENTA CROWN"}
                </span>
              )}
            </Link>

            <nav
              className="absolute left-1/2 top-1/2 z-[10] hidden w-full max-w-[min(860px,calc(100vw-22rem))] -translate-x-1/2 -translate-y-1/2 flex-nowrap items-center justify-center gap-x-3 overflow-visible lg:flex xl:gap-x-5"
              onMouseEnter={clearMegaCloseTimer}
              onMouseLeave={scheduleMegaClose}
              aria-label="Primary"
            >
              <>
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
              </>
            </nav>

            <div
              className={`relative z-[25] ml-auto flex shrink-0 flex-nowrap items-center justify-end ${immersive ? "gap-1.5 sm:gap-2" : "gap-1.5 sm:gap-2 lg:gap-4"}`}
            >
              {!mounted ? (
                <span
                  className={`inline-flex min-h-[44px] min-w-8 items-center justify-center text-xs tabular-nums ${isLight ? "text-zinc-400" : "text-white/50"}`}
                  aria-busy="true"
                  aria-label="Loading"
                >
                  …
                </span>
              ) : (
                <>
                  {showCommerceIcons && !isStaff && (
                    <>
                      <Link
                        href="/cart"
                        className={`relative flex h-11 w-11 shrink-0 items-center justify-center transition active:scale-[0.98] ${
                          isLight ? "text-mc-ink/90 hover:text-mc-maroon" : "text-white hover:text-white/85"
                        }`}
                        aria-label="Cart"
                      >
                        <ShoppingBag className="h-6 w-6" strokeWidth={1.5} />
                        {showCartBadge && (
                          <span
                            className={`absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
                              isLight ? "bg-crown-800 text-white" : "bg-white text-crown-900 shadow-sm"
                            }`}
                            aria-label={`${cartCount} items in cart`}
                          >
                            {cartCount > 99 ? "99+" : cartCount}
                          </span>
                        )}
                      </Link>
                      <SiteNavbarWishlistLink isLight={isLight} />
                    </>
                  )}

                  <button
                    type="button"
                    className={`flex h-11 w-11 shrink-0 items-center justify-center transition active:scale-[0.98] lg:hidden ${
                      isLight ? "text-mc-ink/90 hover:text-mc-maroon" : "text-white hover:text-white/85"
                    }`}
                    aria-label="Search products"
                    title="Search products"
                    aria-expanded={searchOpen}
                    onClick={() => {
                      setOpenMegaTitle(null);
                      setSearchOpen((o) => !o);
                    }}
                  >
                    <Search className="h-5 w-5" strokeWidth={1.8} />
                  </button>

                  <button
                    type="button"
                    className={`hidden h-11 w-11 shrink-0 items-center justify-center transition active:scale-[0.98] lg:flex ${
                      isLight ? "text-mc-ink/90 hover:text-mc-maroon" : "text-white hover:text-white/85"
                    }`}
                    aria-label="Search products"
                    title="Search products"
                    aria-expanded={searchOpen}
                    onClick={() => {
                      setOpenMegaTitle(null);
                      setSearchOpen((o) => !o);
                    }}
                  >
                    <Search className="h-5 w-5" strokeWidth={1.8} />
                  </button>

                  <button
                    type="button"
                    className={`flex h-11 w-11 shrink-0 items-center justify-center transition lg:hidden ${
                      isLight ? "text-mc-ink/90 hover:text-mc-maroon" : "text-white hover:text-white/85"
                    }`}
                    aria-label="Open menu"
                    aria-expanded={mobileMenuOpen}
                    aria-controls="site-mobile-menu"
                    onClick={() => setMobileMenuOpen(true)}
                  >
                    <Menu className="h-6 w-6" strokeWidth={2} />
                  </button>

                  {isLoading ? (
                    <span className={`hidden text-xs lg:inline ${isLight ? "text-zinc-500" : "text-white/80"}`}>…</span>
                  ) : !isAuthed ? (
                    <Link
                      href={signInHref}
                      className={`hidden shrink-0 whitespace-nowrap rounded-full px-5 py-2.5 font-[family-name:var(--font-body)] text-[11px] font-semibold uppercase tracking-[0.14em] transition active:scale-[0.98] sm:px-6 sm:py-3 sm:text-xs lg:inline-flex ${
                        isLight
                          ? "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800"
                          : "border border-white/80 bg-transparent text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)] hover:bg-white/10"
                      }`}
                    >
                      Login
                    </Link>
                  ) : (
                    <div
                      className="relative hidden lg:block"
                      onMouseEnter={() => {
                        clearAccountCloseTimer();
                        setAccountOpen(true);
                      }}
                      onMouseLeave={scheduleAccountClose}
                    >
                      <button
                      type="button"
                      onClick={() => setAccountOpen((o) => !o)}
                      className={`flex items-center gap-2 rounded-full py-1 transition active:scale-[0.98] ${
                        isLight ? "text-zinc-900" : "text-white"
                      }`}
                      aria-haspopup="menu"
                      aria-expanded={accountOpen}
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold uppercase ${
                          isLight ? "border-zinc-300 bg-zinc-100 text-zinc-800" : "border-white/60 bg-transparent text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
                        }`}
                      >
                        {(userName ?? userEmail ?? "?").slice(0, 1)}
                      </span>
                      <ChevronDown className="hidden h-4 w-4 sm:block" />
                      </button>
                    {accountOpen && (
                      <>
                        <button
                          type="button"
                          className="fixed inset-0 z-[4990] cursor-default bg-black/0"
                          aria-label="Close menu"
                          onClick={() => setAccountOpen(false)}
                        />
                        <div
                          className={`absolute right-0 z-[5010] mt-2 min-w-[200px] rounded-xl border py-2 shadow-2xl ${
                            isLight
                              ? "border-zinc-300/90 bg-gradient-to-b from-white to-zinc-100/95 text-zinc-950 ring-1 ring-zinc-900/[0.06]"
                              : "border-white/20 bg-gradient-to-b from-zinc-900/95 to-zinc-950 text-zinc-100 ring-1 ring-white/10"
                          }`}
                          onMouseEnter={clearAccountCloseTimer}
                          onMouseLeave={scheduleAccountClose}
                        >
                          {isStaff && (
                            <Link
                              href="/admin"
                              className={`block px-4 py-2 text-sm font-medium ${isLight ? "hover:bg-zinc-200/60" : "hover:bg-white/10"}`}
                              onClick={() => setAccountOpen(false)}
                            >
                              Admin
                            </Link>
                          )}
                          <Link
                            href="/account/profile"
                            className={`block px-4 py-2 text-sm font-medium ${isLight ? "hover:bg-zinc-200/60" : "hover:bg-white/10"}`}
                            onClick={() => setAccountOpen(false)}
                          >
                            Profile
                          </Link>
                          {!isStaff && (
                            <>
                              <Link
                                href="/account/orders"
                                className={`block px-4 py-2 text-sm font-medium ${isLight ? "hover:bg-zinc-200/60" : "hover:bg-white/10"}`}
                                onClick={() => setAccountOpen(false)}
                              >
                                Orders
                              </Link>
                              <Link
                                href="/account/wishlist"
                                className={`block px-4 py-2 text-sm font-medium ${isLight ? "hover:bg-zinc-200/60" : "hover:bg-white/10"}`}
                                onClick={() => setAccountOpen(false)}
                              >
                                Wishlist
                              </Link>
                            </>
                          )}
                          <button
                            type="button"
                            className={`block w-full px-4 py-2 text-left text-sm font-medium ${isLight ? "hover:bg-zinc-200/60" : "hover:bg-white/10"}`}
                            onClick={() => {
                              setAccountOpen(false);
                              void logout().then(() => {
                                window.location.assign("/auth/signin");
                              });
                            }}
                          >
                            Log out
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
      {mobileDrawer}
      <SiteSearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
});

SiteNavbar.displayName = "SiteNavbar";
