"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { CookieConsentProvider } from "@/context/CookieConsentContext";
import { ShopProvider } from "@/context/ShopContext";
import { HeroReadyProvider } from "@/context/HeroReadyContext";

export function Providers({ children, loaderLogoSrc }: { children: ReactNode; loaderLogoSrc?: string }) {
  return (
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          <ShopProvider>
            <CookieConsentProvider>
              <HeroReadyProvider loaderLogoSrc={loaderLogoSrc}>
                {children}
              </HeroReadyProvider>
            </CookieConsentProvider>
          </ShopProvider>
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>
  );
}
