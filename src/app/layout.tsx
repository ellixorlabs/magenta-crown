import type { Metadata, Viewport } from "next";
import { Cinzel, Inter, Playfair_Display } from "next/font/google";
import { Providers } from "@/app/providers";
import { GlassBackButton } from "@/components/layout/GlassBackButton";
import { getBrandSettings } from "@/lib/brand-settings";
import { getCanonicalSiteUrl } from "@/lib/seo";
import "./globals.css";

const brandFont = Cinzel({
  subsets: ["latin"],
  variable: "--font-brand",
  weight: ["400", "500", "600", "700"]
});

const headingFont = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading"
});

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body"
});

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrandSettings();
  const favicon = brand.faviconUrl || "/icon.png";
  const pwa192 = brand.pwaIcon192Url || "/icon-192.png";
  const pwa512 = brand.pwaIcon512Url || "/icon-512.png";
  const appleTouch = brand.appleTouchIconUrl || pwa192;
  return {
    metadataBase: new URL(getCanonicalSiteUrl()),
    applicationName: "Magenta Crown",
    manifest: "/manifest.webmanifest",
    title: {
      default: "Magenta Crown — Luxury women's boutique",
      template: "%s | Magenta Crown"
    },
    description:
      "Luxury women's occasionwear — sarees, lehengas, and curated collections. Shop Magenta Crown online.",
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: "Magenta Crown"
    },
    twitter: { card: "summary_large_image" },
    appleWebApp: {
      capable: true,
      title: "Magenta Crown",
      statusBarStyle: "default"
    },
    other: {
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "default",
      "apple-mobile-web-app-title": "Magenta Crown"
    },
    icons: {
      icon: [
        { url: favicon },
        { url: pwa192, sizes: "192x192", type: "image/png" },
        { url: pwa512, sizes: "512x512", type: "image/png" }
      ],
      apple: [{ url: appleTouch, type: "image/png" }]
    },
    robots: { index: true, follow: true }
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#7d1e3e"
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const brand = await getBrandSettings();
  return (
    <html lang="en" className="h-full overflow-x-hidden">
      <body
        className={`min-h-dvh overflow-x-hidden ${brandFont.variable} ${headingFont.variable} ${bodyFont.variable}`}
      >
        <Providers loaderLogoSrc={brand.breathingLogoUrl || undefined}>
          <GlassBackButton />
          {children}
        </Providers>
      </body>
    </html>
  );
}
