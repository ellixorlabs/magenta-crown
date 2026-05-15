import path from "path";
import { randomUUID } from "node:crypto";
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const revision =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  register: true,
  reloadOnOnline: true,
  cacheOnNavigation: true,
  additionalPrecacheEntries: [{ url: "/offline", revision }],
});

const nextConfig = {
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
    "*.ngrok.dev",
  ],
  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/shop",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
  images: {
    // In local dev, bypass server-side optimization fetches so external hosts
    // that block hotlinking (or resolve via NAT64/private ranges) still render.
    unoptimized: process.env.NODE_ENV === "development",
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    qualities: [75, 80],
    /**
     * Supabase Storage serves original objects from `*.supabase.co/.../object/public/...`.
     * URL query transforms (`?width=`) need the Storage image transformation add-on (Pro).
     * Storefront uses `next/image` for responsive derivatives instead.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ppxamrrvfijwttnpwzlr.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.supabase.in",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "www.vastranand.in",
      },
      {
        protocol: "https",
        hostname: "vastranand.in",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images6.alphacoders.com",
      },
      {
        protocol: "https",
        hostname: "azafashions.com",
      },
      {
        protocol: "https",
        hostname: "www.azafashions.com",
      },
      {
        protocol: "https",
        hostname: "i.imageupload.app",
      },
    ],
  },
} satisfies NextConfig;

export default withSerwist(nextConfig);
