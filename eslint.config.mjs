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
const ROLE_SLASH = String.raw`(^|[\s:!])text-(stat-form|stat-hero|display|title|article-title|stat|score|heading|reading|summary|button|body|label|meta|badge|caption|micro)\x2F`;
const ROLE_SLASH_MSG = "역할 토큰 뒤에 /줄간격을 붙이면 굵기·자간이 빠진다. 줄 간격은 leading-*로 덮어쓴다.";


/*
 * 폴더 방향 규칙(ARCHITECTURE.md 2절)에 쓰는 import 경로 패턴. AREAS는 src/components 아래 화면 영역 폴더다(새 영역을 만들면 더한다).
 */
const AREAS = ["compare", "home", "my", "news", "player", "players", "records"];
const LIB_UP = {
  regex: "^@/(components|app)(/|$)",
  message: "lib는 화면 조각(components)과 라우트(app)를 모른다(ARCHITECTURE.md 2절). 필요한 값은 lib로 옮긴다.",
};
const APP_FROM_COMPONENTS = {
  regex: "^@/app(/|$)",
  message: "화면 조각은 라우트 폴더(app)를 모른다(ARCHITECTURE.md 2절). 서버 함수는 lib/actions에 둔다.",
};
const UP_RELATIVE = {
  regex: "^\\.\\./",
  message: "위 폴더로 올라가는 상대 경로 대신 @/ 경로를 쓴다(폴더 방향 규칙이 @/ 경로로 검사한다).",
};
const SHARED_TO_AREA = {
  regex: "^(@/components/|\\./)[^/]+/",
  message: "공용 조각은 화면 영역 폴더(home·my …)를 모른다(ARCHITECTURE.md 2절). 그 조각도 여러 영역이 쓰면 공용 자리로 옮긴다.",
};
const otherArea = (area) => ({
  regex: `^@/components/(?!${area}/)[^/]+/`,
  message: `화면 영역 폴더(${area})는 다른 영역 폴더를 모른다(ARCHITECTURE.md 2절). 두 영역이 쓰는 조각은 공용 자리(src/components/ 바로 아래)로 옮긴다.`,
});

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
  // 폴더 방향(ARCHITECTURE.md 2절): app(라우트) → components → lib. lib는 components·app을, components는 app을 모른다.
  // components 바로 아래 공용 조각은 영역 폴더를, 영역 폴더(home·my …)는 다른 영역 폴더를 모른다. 두 영역이 쓰는 조각은 공용 자리로 옮긴다.
  // 위 폴더로 올라가는 상대 경로(../)는 쓰지 않는다(@/ 경로로만 부르면 아래 규칙이 빠짐없이 본다).
  // 같은 파일에 여러 묶음이 걸리면 뒤 묶음의 설정이 앞 묶음을 덮으므로, 묶음마다 필요한 규칙을 모두 적는다.
  {
    files: ["src/lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [LIB_UP, UP_RELATIVE] }],
    },
  },
  {
    files: ["src/components/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [APP_FROM_COMPONENTS, UP_RELATIVE, SHARED_TO_AREA] }],
    },
  },
  ...AREAS.map((area) => ({
    files: [`src/components/${area}/**/*.{ts,tsx}`],
    rules: {
      "no-restricted-imports": ["error", { patterns: [APP_FROM_COMPONENTS, UP_RELATIVE, otherArea(area)] }],
    },
  })),
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
