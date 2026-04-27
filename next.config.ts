import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hiimsbucket.s3.ap-south-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "newhiims.dikonia.in",
      },
    ],
  },
};

export default nextConfig;
