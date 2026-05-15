"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { CookieConsentProvider } from "@/context/CookieConsentContext";
import { ShopProvider } from "@/context/ShopContext";
import { HeroReadyProvider } from "@/context/HeroReadyContext";
import { PwaInstallPrompt } from "@/components/pwa/PwaInstallPrompt";
import { SWRConfig } from "swr";

export function Providers({ children, loaderLogoSrc }: { children: ReactNode; loaderLogoSrc?: string }) {
  return (
    <SWRConfig
      value={{
        dedupingInterval: 1500,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        shouldRetryOnError: true,
        keepPreviousData: true
      }}
    >
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            <ShopProvider>
              <CookieConsentProvider>
                <HeroReadyProvider loaderLogoSrc={loaderLogoSrc}>
                  {children}
                  <PwaInstallPrompt />
                </HeroReadyProvider>
              </CookieConsentProvider>
            </ShopProvider>
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </SWRConfig>
  );
}
