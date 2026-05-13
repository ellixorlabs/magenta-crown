"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo } from "react";
import { useEffect, useState } from "react";
import { Home, ShoppingBag, ShoppingCart, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useDevRenderLog } from "@/lib/dev-performance";

const tabs = [
  {
    href: "/shop",
    label: "Shop",
    icon: ShoppingBag,
    match: (p: string) =>
      p === "/shop" ||
      p.startsWith("/shop?") ||
      p.startsWith("/shop/") ||
      p.startsWith("/product/") ||
      p === "/categories"
  },
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { href: "/cart", label: "Cart", icon: ShoppingCart, match: (p: string) => p === "/cart" || p.startsWith("/checkout") },
  {
    href: "/account/profile",
    label: "Profile",
    icon: User,
    match: (p: string) => p.startsWith("/account")
  }
] as const;

function McBottomTabBarInner() {
  useDevRenderLog("McBottomTabBar", 20);
  const pathname = usePathname() ?? "";
  const { isAuthenticated, isLoading } = useAuth();
  const { items: cartItems, cartHydrated } = useCart();
  const [hideForKeyboard, setHideForKeyboard] = useState(false);
  const cartCount = cartItems.reduce((n, it) => n + it.quantity, 0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasTextFocus = () => {
      const active = document.activeElement as HTMLElement | null;
      if (!active) return false;
      if (active.isContentEditable) return true;
      const tag = active.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    };

    const onFocusIn = () => setHideForKeyboard(hasTextFocus());
    const onFocusOut = () => {
      window.setTimeout(() => setHideForKeyboard(hasTextFocus()), 0);
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    const vv = window.visualViewport;
    const baseHeight = window.innerHeight;
    const onViewport = () => {
      if (!vv) return;
      const keyboardOpen = baseHeight - vv.height > 140;
      setHideForKeyboard(keyboardOpen || hasTextFocus());
    };
    vv?.addEventListener("resize", onViewport);

    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      vv?.removeEventListener("resize", onViewport);
    };
  }, []);

  if (hideForKeyboard) {
    return null;
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[4900] border-t border-mc-ink/10 bg-mc-cream/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_24px_-8px_rgba(26,26,26,0.08)] backdrop-blur-md md:hidden"
      aria-label="Primary mobile"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2">
        {tabs.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          const isProfile = href === "/account/profile";
          const profileHref = !isLoading && isAuthenticated ? "/account/profile" : "/auth/signin?callbackUrl=%2Faccount%2Fprofile";
          const finalHref = isProfile ? profileHref : href;

          return (
            <Link
              key={label}
              href={finalHref}
              className={`flex min-w-[4.25rem] flex-col items-center gap-0.5 rounded-xl px-2 py-1 transition duration-200 active:scale-[0.97] ${
                active ? "text-mc-accent" : "text-mc-ink/70"
              }`}
            >
              <span className="relative flex h-9 w-9 items-center justify-center">
                {label === "Cart" && cartHydrated && cartCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-mc-accent px-1 text-[9px] font-bold text-white tabular-nums">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                ) : null}
                <Icon
                  className={`h-[22px] w-[22px] transition ${active ? "stroke-[2.25px]" : "stroke-[1.75px]"}`}
                  strokeWidth={active ? 2.25 : 1.75}
                />
              </span>
              <span className={`text-[10px] font-semibold tracking-wide ${active ? "text-mc-accent" : "text-mc-ink/65"}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export const McBottomTabBar = memo(McBottomTabBarInner);
McBottomTabBar.displayName = "McBottomTabBar";
