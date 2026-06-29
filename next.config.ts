import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/fasttrack",
  env: {
    NEXT_PUBLIC_BASE_PATH: "/fasttrack",
  },
};

export default nextConfig;
