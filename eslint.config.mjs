import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/*
 * 글자 크기는 globals.css @theme의 역할 토큰(text-display, text-body …)만 쓴다(이슈 #204, DESIGN.md The Role Token Rule).
 * 막는 것: className 문자열·템플릿 안의 임의 크기(text-[13px], sm:text-[1.375rem]), Tailwind 기본 크기 이름(text-xs~text-9xl,
 * @theme에서 꺼서 써도 아무 일도 안 일어난다), JSX style의 fontSize.
 * 그림 글자(사진 원 안 이니셜, 상태 안내 이모지)는 그 줄에 eslint-disable 주석과 이유를 적어 예외로 둔다.
 */
const TYPE_MSG =
  "글자 크기는 역할 토큰(text-display·text-title·text-heading·text-summary·text-body·text-label·text-caption 등)만 쓴다. 새 크기가 필요하면 globals.css @theme와 DESIGN.md Typography에 역할부터 추가한다.";
// 임의 크기: text-[13px]·text-[.8rem]·text-[length:…]·text-[calc(…)]·text-(length:--x). 색(text-[#…], text-[var(--color…)])은 막지 않는다
const ARBITRARY = String.raw`(^|[\s:!])text-(\[(length:|[\d.]|calc\(|clamp\(|min\(|max\()|\(length:)`;
// Tailwind 기본 크기 이름 text-xs·sm·base·lg·xl·2xl~9xl(꺼져서 아무 스타일도 안 나온다). text-sm/6·text-lg!·!text-lg 형태도.
// esquery 정규식 안에는 '/'를 쓸 수 없어 \x2F로 적는다
const DEFAULT_SCALE = String.raw`(^|[\s:!])text-(xs|sm|base|lg|[2-9]?xl)($|[\s!]|\x2F)`;
// 역할 뒤 /줄간격(text-body/6)은 Tailwind가 굵기·자간을 빼고 만들어 역할이 깨진다. 줄 간격은 leading-*로 바꾼다
const ROLE_SLASH = String.raw`(^|[\s:!])text-(stat-form|stat-hero|display|title|article-title|stat-sm|stat|score|heading|reading|summary|button|body|label|meta|badge|caption|micro)\x2F`;
const ROLE_SLASH_MSG = "역할 토큰 뒤에 /줄간격을 붙이면 굵기·자간이 빠진다. 줄 간격은 leading-*로 덮어쓴다.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    // 공유 그림(1200×630 OG 이미지)은 화면 글자가 아니라 그림이라 대상 밖
    ignores: ["src/app/opengraph-image.tsx", "src/app/**/og/**", "src/lib/og.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: `Literal[value=/${ARBITRARY}/]`, message: TYPE_MSG },
        { selector: `TemplateElement[value.raw=/${ARBITRARY}/]`, message: TYPE_MSG },
        { selector: `Literal[value=/${DEFAULT_SCALE}/]`, message: TYPE_MSG },
        { selector: `TemplateElement[value.raw=/${DEFAULT_SCALE}/]`, message: TYPE_MSG },
        { selector: `Literal[value=/${ROLE_SLASH}/]`, message: ROLE_SLASH_MSG },
        { selector: `TemplateElement[value.raw=/${ROLE_SLASH}/]`, message: ROLE_SLASH_MSG },
        { selector: "JSXAttribute[name.name='style'] Property[key.name='fontSize']", message: TYPE_MSG },
        { selector: "JSXAttribute[name.name='style'] Property[key.value='fontSize']", message: TYPE_MSG },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
