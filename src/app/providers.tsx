"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { CookieConsentProvider } from "@/context/CookieConsentContext";
import { ShopProvider } from "@/context/ShopContext";
import { HeroReadyProvider } from "@/context/HeroReadyContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <ShopProvider>
          <CookieConsentProvider>
            <HeroReadyProvider>
              {children}
            </HeroReadyProvider>
          </CookieConsentProvider>
        </ShopProvider>
      </CartProvider>
    </AuthProvider>
  );
}
