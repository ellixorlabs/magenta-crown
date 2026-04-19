import type { Metadata, Viewport } from "next";
import { Cinzel, Inter, Playfair_Display } from "next/font/google";
import { Providers } from "@/app/providers";
import { GlassBackButton } from "@/components/layout/GlassBackButton";
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

export const metadata: Metadata = {
  metadataBase: new URL(getCanonicalSiteUrl()),
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
  robots: { index: true, follow: true }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full overflow-x-hidden">
      <body
        className={`min-h-dvh overflow-x-hidden ${brandFont.variable} ${headingFont.variable} ${bodyFont.variable}`}
      >
        <Providers>
          <GlassBackButton />
          {children}
        </Providers>
      </body>
    </html>
  );
}
