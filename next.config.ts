import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev hydration/HMR is blocked for hosts not listed here (Next 16+).
  // Localhost vs 127.0.0.1 and Cloudflare quick tunnels must be allowed.
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "*.trycloudflare.com",
  ],
};

export default nextConfig;
