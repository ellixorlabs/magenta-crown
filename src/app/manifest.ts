import type { MetadataRoute } from "next";
import { getBrandSettings } from "@/lib/brand-settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const brand = await getBrandSettings();
  const icon192 = brand.pwaIcon192Url || "/icon-192.png";
  const icon512 = brand.pwaIcon512Url || "/icon-512.png";

  return {
    name: "Magenta Crown",
    short_name: "Magenta",
    description: "Luxury women's occasionwear - shop sarees, lehengas, and curated collections.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#7d1e3e",
    theme_color: "#7d1e3e",
    orientation: "portrait",
    icons: [
      {
        src: icon192,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: icon512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}

