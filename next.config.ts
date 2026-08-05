import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
    ],
    minimumCacheTTL: 2678400,
    formats: ["image/webp"],
    qualities: [75],
  },
};

export default nextConfig;
