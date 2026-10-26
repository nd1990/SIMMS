import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "standalone",
  basePath: basePath || undefined,
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
};

export default nextConfig;
