import type { Metadata } from "next";
import { Cinzel, Inter, Playfair_Display } from "next/font/google";
import { Providers } from "@/app/providers";
import { GlassBackButton } from "@/components/layout/GlassBackButton";
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
  title: "Magenta Crown",
  description: "Luxury women's boutique"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${brandFont.variable} ${headingFont.variable} ${bodyFont.variable}`}
      >
        <Providers>
          <GlassBackButton />
          {children}
        </Providers>
      </body>
    </html>
  );
}
