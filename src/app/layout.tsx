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
  const icon = brand.faviconUrl || "/icon.png";
  return {
    metadataBase: new URL(getCanonicalSiteUrl()),
    applicationName: "Magenta Crown",
    manifest: "/manifest.json",
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
        { url: icon },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
      ],
      apple: [{ url: "/icon-192.png", type: "image/png" }]
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
  themeColor: "#000000"
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
