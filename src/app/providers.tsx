"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { CookieConsentProvider } from "@/context/CookieConsentContext";
import { ShopProvider } from "@/context/ShopContext";
import { HeroReadyProvider } from "@/context/HeroReadyContext";
import { NeonKeepAlive } from "@/components/layout/NeonKeepAlive";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <ShopProvider>
          <CookieConsentProvider>
            <HeroReadyProvider>
              <NeonKeepAlive />
              {children}
            </HeroReadyProvider>
          </CookieConsentProvider>
        </ShopProvider>
      </CartProvider>
    </AuthProvider>
  );
}
