import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/fasttrack",
  env: {
    NEXT_PUBLIC_BASE_PATH: "/fasttrack",
  },
  async redirects() {
    return [
      {
        // basePath: false so source/destination are used as literal paths,
        // not auto-prefixed with /fasttrack
        source: "/",
        destination: "/fasttrack",
        permanent: false,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
