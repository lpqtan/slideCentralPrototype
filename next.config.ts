import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
  serverExternalPackages: ["mongodb"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
