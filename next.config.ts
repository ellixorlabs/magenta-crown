import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid resolving deps from a parent folder when multiple lockfiles exist (can cause duplicate React → invalid hook call).
  outputFileTracingRoot: path.join(__dirname),
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
      }
    ]
  }
};

export default nextConfig;
