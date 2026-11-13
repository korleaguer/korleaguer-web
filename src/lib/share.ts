import type { Metadata } from "next";

/**
 * 공유 미리보기(og:)와 공유 링크에 쓰는 사이트 주소. 그림 주소(og:image)를 절대 주소로 만드는 데 쓴다.
 * 서버 환경변수 SITE_URL로 바꿀 수 있다(시험 서버 등). 기본은 운영 주소.
 */
export const SITE_URL = process.env.SITE_URL ?? "https://pigeon.ddns.net";

export const SITE_NAME = "KOR Leaguer";

/** 사이트 기본 공유 그림(app/opengraph-image.tsx)의 설명 */
export const SITE_IMAGE_ALT = `${SITE_NAME} — 해외파 한국 선수 기록 모아보기`;

/**
 * 공유 그림 주소에 넣는 판 번호: 배포한 커밋(이미지를 만들 때 APP_COMMIT으로 박힌다, /healthz와 같은 값). 로컬은 "dev".
 * 카카오톡은 미리보기 그림을 '그림 주소' 기준으로 서버와 기기에 저장해 두고, 주소가 같으면 그림이 바뀌어도 옛 그림을 보여 준다.
 * Next.js가 붙이는 주소 뒤 표시(?해시)는 opengraph-image.tsx 파일 내용만 보고 만들어서, 로고(lib/logo.ts)나 그림 틀(lib/og.tsx)을
 * 바꿔도 주소가 그대로였다(이슈 #157). 그래서 그림 주소를 /opengraph-image/<커밋>으로 만들어 배포마다 새 주소가 되게 한다.
 */
export const OG_VERSION = process.env.APP_COMMIT ?? "dev";

/**
 * 사이트 기본 그림(app/opengraph-image.tsx)이 내보내는 generateImageMetadata의 값. id가 주소에 들어간다: /opengraph-image/<OG_VERSION>.
 * (선수·기사 그림은 이 방식이면 Next가 미리 만들 그림으로 분류해 요청 때 데이터를 못 받아서, og/[v]/route.tsx 주소 처리기로 둔다)
 * 그림 크기·종류·설명(alt)도 여기서 정한다(이 함수를 쓰면 size·contentType·alt를 따로 내보내지 않는다).
 */
export function ogImageMetadata(alt: string) {
  return [{ id: OG_VERSION, size: { width: 1200, height: 630 }, contentType: "image/png", alt }];
}

/** 공유 그림 하나: 주소(사이트 안 경로)와 설명 */
export type ShareImage = { url: string; alt: string };

/** 선수 페이지 공유 그림(app/players/[id]/og/[v]/route.tsx). 주소에 판 번호가 들어간다 */
export function playerShareImage(id: number): ShareImage {
  return { url: `/players/${id}/og/${OG_VERSION}`, alt: `${SITE_NAME} 선수 기록` };
}

/** 기사 페이지 공유 그림(app/news/[id]/og/[v]/route.tsx). 주소에 판 번호가 들어간다 */
export function newsShareImage(id: number): ShareImage {
  return { url: `/news/${id}/og/${OG_VERSION}`, alt: `${SITE_NAME} 기사 요약` };
}

/**
 * 화면별 공유 미리보기 정보. 페이지에서 openGraph를 정하면 layout의 openGraph를 통째로 덮어써서(기본 그림까지 빠진다),
 * 사이트 이름·언어·종류와 그림을 매번 함께 넣는다. 그림을 주지 않으면 사이트 기본 그림(app/opengraph-image.tsx,
 * 주소는 /opengraph-image/<OG_VERSION>)이다. 선수·기사는 playerShareImage·newsShareImage를 준다.
 */
export function shareMeta(
  title: string,
  description?: string,
  image: ShareImage = { url: `/opengraph-image/${OG_VERSION}`, alt: SITE_IMAGE_ALT },
): Pick<Metadata, "openGraph"> {
  return {
    openGraph: {
      title,
      description,
      siteName: SITE_NAME,
      locale: "ko_KR",
      type: "website",
      images: [{ ...image, width: 1200, height: 630, type: "image/png" }],
    },
  };
}
