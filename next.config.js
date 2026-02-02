
/**@type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";
const nextConfig = {
  output: "export",
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
};

module.exports = nextConfig;
