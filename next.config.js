
/**@type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  // basePath: isProd ? "/tailwind/app/dharwin-business-solutions/preview" : undefined,
  // assetPrefix : isProd ? "/tailwind/app/dharwin-business-solutions/preview" : undefined,
  basePath: "",
  assetPrefix: "",
  images: {
    loader: "imgix",
    path: "/",
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // In dev, proxy /api/v1 to backend so cookies are same-origin and survive refresh
  async rewrites() {
    // Backend origin (no trailing path) — same as api proxy target
    const backend =
      process.env.NEXT_PUBLIC_API_BACKEND_URL ||
      process.env.BACKEND_URL ||
      (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/v1\/?$/, "").replace(/\/api\/?$/, "") : null) ||
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
      ...oauthCallbacks,
    ];
  },
};

module.exports = nextConfig;
