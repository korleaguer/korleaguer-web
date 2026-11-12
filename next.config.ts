import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 이미지용: 실행에 필요한 파일만 .next/standalone에 모은다(서버에서 node server.js로 실행).
  output: "standalone",
  // 공유 미리보기 그림(opengraph-image)이 읽는 한글 글꼴. 코드에서 파일로 읽어서 standalone 출력에 저절로 따라오지 않는다(src/lib/og.tsx)
  outputFileTracingIncludes: {
    "/**/opengraph-image*": ["./node_modules/pretendard/dist/public/static/Pretendard-{Bold,ExtraBold}.otf"],
  },
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
