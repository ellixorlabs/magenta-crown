"use client";

import { Suspense, type ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { CookieConsentProvider } from "@/context/CookieConsentContext";
import { ShopProvider } from "@/context/ShopContext";
import { GlobalPageLoader } from "@/components/layout/GlobalPageLoader";
import { NeonKeepAlive } from "@/components/layout/NeonKeepAlive";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <ShopProvider>
          <CookieConsentProvider>
            <NeonKeepAlive />
            <Suspense fallback={null}>
              <GlobalPageLoader />
            </Suspense>
            {children}
          </CookieConsentProvider>
        </ShopProvider>
      </CartProvider>
    </AuthProvider>
  );
}
