
/**@type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  experimental: {
    optimizePackageImports: [
      "@mui/material",
      "@mui/icons-material",
      "date-fns",
      "@tiptap/react",
      "@tiptap/starter-kit",
    ],
  },
  /** Keep production artifacts smaller (no client .map in deploy bundle).
      Server-side source maps are already off by default in production;
      `experimental.serverSourceMaps` was removed from the Next 16 schema
      and logged as `⨯` when present. Prune step still strips stray .map. */
  productionBrowserSourceMaps: false,
  // basePath: isProd ? "/tailwind/app/dharwin-business-solutions/preview" : undefined,
  // assetPrefix : isProd ? "/tailwind/app/dharwin-business-solutions/preview" : undefined,
  basePath: "",
  assetPrefix: "",
  /** Legacy bookmarks → canonical ATS list (Phase A; permanent redirect). */
  async redirects() {
    return [
      { source: "/ats/candidates", destination: "/ats/employees/", permanent: true },
      { source: "/ats/candidates/", destination: "/ats/employees/", permanent: true },
      { source: "/ats/candidates/:path*", destination: "/ats/employees/:path*", permanent: true },
    ];
  },
  images: {
    loader: "imgix",
    path: "/",
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // In dev, proxy /api/v1 to backend so cookies are same-origin and survive refresh
  async rewrites() {
    // Never derive the rewrite host from a relative NEXT_PUBLIC_API_URL (`/api/v1`) —
    // that used to keep proxying to production after an env reload, and prod CORS
    // rejects http://localhost:3001.
    const explicit =
      process.env.NEXT_PUBLIC_API_BACKEND_URL || process.env.BACKEND_URL || "";
    const fromApiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const derivedHost = /^https?:\/\//i.test(fromApiUrl)
      ? fromApiUrl.replace(/\/v1\/?$/, "").replace(/\/api\/?$/, "")
      : "";
    const backend =
      explicit ||
      (process.env.NODE_ENV === "production" ? derivedHost : "") ||
      "http://localhost:3000";
    const b = backend.replace(/\/$/, "");

    /**
     * OAuth redirects often use the *browser* origin (e.g. localhost:3001 = Next dev).
     * API calls use /api/v1 → backend, but Microsoft hits /v1/... directly — without this,
     * Next serves not-found. Proxy these paths to Express.
     */
    const oauthCallbacks = [
      "/v1/email/auth/google/callback",
      "/v1/email/auth/microsoft/callback",
      "/v1/outlook/auth/microsoft/callback",
    ].flatMap((path) => [
      { source: path, destination: `${b}${path}` },
      { source: `${path}/`, destination: `${b}${path}/` },
    ]);

    return [
      { source: "/api/v1/:path*", destination: `${b}/v1/:path*` },
      // trailingSlash: true redirects /api/v1/foo → /api/v1/foo/; without this, the trailing-slash URL misses the rewrite and returns Next 404 ("Not found")
      { source: "/api/v1/:path*/", destination: `${b}/v1/:path*/` },
      ...oauthCallbacks,
    ];
  },
  /**
   * Long-cache static assets served by Next (public/ and build output).
   * User-uploaded files on S3/CloudFront need Cache-Control on the bucket/CDN separately.
   */
  async headers() {
    const longCache = [
      { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
    ];
    return [
      { source: "/assets/:path*", headers: longCache },
      { source: "/fonts/:path*", headers: longCache },
      { source: "/_next/static/:path*", headers: longCache },
    ];
  },
};

module.exports = nextConfig;
