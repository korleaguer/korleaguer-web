import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 이미지용: 실행에 필요한 파일만 .next/standalone에 모은다(서버에서 node server.js로 실행).
  output: "standalone",
  // 공유 미리보기 그림(opengraph-image)이 읽는 한글 글꼴. 코드에서 파일로 읽어서 standalone 출력에 저절로 따라오지 않는다(src/lib/og.tsx)
  outputFileTracingIncludes: {
    "/**/opengraph-image*": ["./node_modules/pretendard/dist/public/static/Pretendard-{Bold,ExtraBold}.otf"],
  },
  // 압축은 앞단 Caddy(encode zstd gzip, korleaguer-server deploy/Caddyfile)가 한다. Next가 먼저 gzip으로 누르면
  // Caddy가 다시 누르지 않아 zstd를 받는 브라우저(크롬 등)도 gzip을 받는다(선수 화면 26KB, zstd면 19KB).
  // 사파리·아이폰 앱은 zstd를 몰라 Caddy가 gzip으로 준다. 라즈베리파이의 Node가 압축을 안 해도 되는 덤도 있다.
  compress: false,
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
