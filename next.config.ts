import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 이미지용: 실행에 필요한 파일만 .next/standalone에 모은다(서버에서 node server.js로 실행).
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
