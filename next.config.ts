import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["mongodb"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
