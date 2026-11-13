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
// text-[숫자…] 임의 크기(앞에 sm: 같은 변형이 붙어도)
const ARBITRARY = String.raw`(^|[\s:])text-\[\d`;
// Tailwind 기본 크기 이름 text-xs·sm·base·lg·xl·2xl~9xl
const DEFAULT_SCALE = String.raw`(^|[\s:])text-(xs|sm|base|lg|[2-9]?xl)($|\s)`;

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
        { selector: "JSXAttribute[name.name='style'] Property[key.name='fontSize']", message: TYPE_MSG },
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
