
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
    // For local development, point to local backend; in production, use NEXT_PUBLIC_API_BACKEND_URL if set
    const backend =
      process.env.NEXT_PUBLIC_API_BACKEND_URL ||
      process.env.BACKEND_URL ||
      "http://localhost:3000";
    return [{ source: "/api/v1/:path*", destination: `${backend}/v1/:path*` }];
  },
};

module.exports = nextConfig;
