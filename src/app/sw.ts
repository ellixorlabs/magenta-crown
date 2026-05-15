import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { ExpirationPlugin, NetworkOnly, Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const sensitiveApi = new NetworkOnly();

const supabasePublicImage = new StaleWhileRevalidate({
  cacheName: "supabase-public-images",
  plugins: [
    new ExpirationPlugin({
      maxEntries: 120,
      maxAgeSeconds: 7 * 24 * 60 * 60,
      maxAgeFrom: "last-used"
    })
  ]
});

const homepageBannerImages = new StaleWhileRevalidate({
  cacheName: "homepage-banner-images",
  plugins: [
    new ExpirationPlugin({
      maxEntries: 48,
      maxAgeSeconds: 365 * 24 * 60 * 60,
      maxAgeFrom: "last-used"
    })
  ]
});

const publicGetApi = new StaleWhileRevalidate({
  cacheName: "public-get-apis",
  plugins: [
    new ExpirationPlugin({
      maxEntries: 48,
      maxAgeSeconds: 6 * 60 * 60,
      maxAgeFrom: "last-used"
    })
  ]
});

const runtimeCaching = [
  {
    matcher: ({ url: { pathname }, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
      sameOrigin &&
      (pathname.startsWith("/api/auth/") ||
        pathname.startsWith("/api/user/") ||
        pathname.startsWith("/api/checkout") ||
        pathname.startsWith("/api/payments/")),
    handler: sensitiveApi
  },
  {
    matcher: ({ url, request }: { url: URL; request: Request }) =>
      request.method === "GET" &&
      (url.hostname.endsWith(".supabase.co") || url.hostname.endsWith(".supabase.in")) &&
      url.pathname.includes("/storage/v1/object/public") &&
      url.pathname.includes("/homepage/banners/"),
    handler: homepageBannerImages
  },
  {
    matcher: ({ url, request }: { url: URL; request: Request }) =>
      request.method === "GET" &&
      (url.hostname.endsWith(".supabase.co") || url.hostname.endsWith(".supabase.in")) &&
      url.pathname.includes("/storage/v1/object/public"),
    handler: supabasePublicImage
  },
  {
    matcher: ({ sameOrigin, request, url }: { sameOrigin: boolean; request: Request; url: URL }) =>
      sameOrigin && request.method === "GET" && url.pathname.startsWith("/api/public/"),
    handler: publicGetApi
  },
  ...defaultCache
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        }
      }
    ]
  }
});

serwist.addEventListeners();
