/** @type {import('next').NextConfig} */
const nextConfig = {
  // Served under https://acap.arso-oran.org/arso via IIS ARR → this host.
  basePath: "/arso",
  // Nodemailer uses Node sockets. Keep it out of the server bundle.
  serverExternalPackages: ["nodemailer"],
  // Dev hydration/HMR is blocked for hosts not listed here (Next 16+).
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "acap.arso-oran.org",
    "*.trycloudflare.com",
  ],
  // Avoid stale HTML/API after deploys. Hashed /_next/static keeps long cache.
  async headers() {
    return [
      {
        source: "/((?!_next/static/).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, max-age=0, must-revalidate",
          },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
