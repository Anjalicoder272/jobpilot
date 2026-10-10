import type { NextConfig } from "next";

// Where the Django API lives. Tolerates small typos in the env var: spaces, quotes,
// a missing "https://" or a trailing "/".
function apiUrl(): string {
  let url = (process.env.API_URL ?? "").trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
  if (!url) return "http://127.0.0.1:8000";
  if (!/^https?:\/\//.test(url)) url = `https://${url}`;
  return url;
}

const API = apiUrl();
const isDev = process.env.NODE_ENV !== "production";

// Next.js inlines its bootstrap scripts, so script-src needs 'unsafe-inline'; everything else is locked down.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
