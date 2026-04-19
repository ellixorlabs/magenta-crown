import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid resolving deps from a parent folder when multiple lockfiles exist (can cause duplicate React → invalid hook call).
  outputFileTracingRoot: path.join(__dirname),
  /**
   * Next.js dev blocks `/_next/*` (RSC, chunks, HMR) unless Origin matches localhost or this list.
   * Opening the app via a LAN IP otherwise returns 403 for JS — you only see SSR HTML (e.g. a static logo).
   * Ngrok / similar tunnels must be listed or the shell never hydrates (stuck on global loader + no motion).
   * Wildcards follow the same rules as `images.remotePatterns` (dot-separated segments).
   */
  allowedDevOrigins: [
    "192.168.*.*",
    "10.*.*.*",
    "172.*.*.*",
    "169.254.*.*",
    "100.*.*.*",
    "*.local",
    "*.ngrok.io",
    "*.ngrok-free.app",
    "*.ngrok-free.dev",
    "*.ngrok.app",
    "*.ngrok.dev"
  ],
  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, max-age=0, must-revalidate"
          }
        ]
      },
      {
        source: "/shop",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, max-age=0, must-revalidate"
          }
        ]
      }
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "www.vastranand.in"
      },
      {
        protocol: "https",
        hostname: "vastranand.in"
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com"
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com"
      },
      {
        protocol: "https",
        hostname: "images6.alphacoders.com"
      },
      {
        protocol: "https",
        hostname: "azafashions.com"
      },
      {
        protocol: "https",
        hostname: "www.azafashions.com"
      },
      {
        protocol: "https",
        hostname: "i.imageupload.app"
      }
    ]
  }
};

export default nextConfig;
