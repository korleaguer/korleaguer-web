import type { NextConfig } from "next";
// Next가 기본으로 메타를 head에 넣어 주는 수집기 목록(페이스북·X·슬랙·왓츠앱·디스코드·네이버 Yeti 등).
// htmlLimitedBots를 주면 이 목록을 통째로 덮어써서 이 값에 이어 붙인다. Next를 올리다 파일이 옮겨지면 빌드가 멈춰 알 수 있다
import { HTML_LIMITED_BOT_UA_RE } from "next/dist/shared/lib/router/utils/html-bots";

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
  // 공유 미리보기 수집기에는 메타(og:…)를 head에 넣은 완성 HTML을 준다. Next는 보통 메타를 본문 뒤로 흘려 보내서
  // (선수 화면은 약 16만 자 뒤) head만 읽는 수집기는 빈 카드를 만들 수 있다. 기본 목록에 카카오톡(kakaotalk-scrap)·
  // 다음(Daum/·Daumoa)·텔레그램 수집기를 더한다. 카카오톡·다음 앱 안 브라우저(KAKAOTALK, DaumApps)는 걸리지 않는다
  htmlLimitedBots: new RegExp(`${HTML_LIMITED_BOT_UA_RE.source}|kakaotalk-scrap|Daumoa|Daum/|TelegramBot`, "i"),
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
