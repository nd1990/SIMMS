import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "standalone",
  basePath: basePath || undefined,
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  experimental: {
    cpus: 2,
  },
};

export default nextConfig;
