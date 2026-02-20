
/**@type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  // Static export only for production build; in dev, dynamic routes (e.g. /courses/[id]) work without pre-generation
  ...(isProd ? { output: "export" } : {}),
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
  // Only include rewrites in development (not in production with static export)
  ...(isProd ? {} : {
    async rewrites() {
      const backend = process.env.NEXT_PUBLIC_API_BACKEND_URL || "http://localhost:3000";
      return [{ source: "/api/v1/:path*", destination: `${backend}/v1/:path*` }];
    },
  }),
};

module.exports = nextConfig;
