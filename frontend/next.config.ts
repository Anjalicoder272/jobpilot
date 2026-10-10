import type { NextConfig } from "next";

const API = process.env.API_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  // Django URLs end with "/", so don't let Next.js strip the trailing slash.
  skipTrailingSlashRedirect: true,
  // AI requests (prep plans, resume checks) can take 20+ seconds; don't cut the /api proxy off at 30s.
  experimental: { proxyTimeout: 90_000 },
  // Proxy /api to Django so the browser sees one origin (httpOnly cookies just work).
  // The page used to be called "Resume"; keep old links working.
  async redirects() {
    return [{ source: "/resume", destination: "/job-match", permanent: true }];
  },
  async rewrites() {
    return [
      { source: "/api/:path*/", destination: `${API}/api/:path*/` },
      { source: "/api/:path*", destination: `${API}/api/:path*` },
    ];
  },
};

export default nextConfig;
