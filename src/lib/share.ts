import type { Metadata } from "next";

/**
 * 공유 미리보기(og:)와 공유 링크에 쓰는 사이트 주소. 그림 주소(og:image)를 절대 주소로 만드는 데 쓴다.
 * 서버 환경변수 SITE_URL로 바꿀 수 있다(시험 서버 등). 기본은 운영 주소.
 */
export const SITE_URL = process.env.SITE_URL ?? "https://pigeon.ddns.net";

export const SITE_NAME = "KOR Leaguer";

/**
 * 화면별 공유 미리보기 정보. 페이지에서 openGraph를 정하면 layout의 openGraph를 통째로 덮어써서(기본 그림까지 빠진다),
 * 사이트 이름·언어·종류와 기본 그림(app/opengraph-image.tsx)을 매번 함께 넣는다.
 * 선수·기사처럼 그 폴더에 opengraph-image 파일이 있으면 ownImage를 true로 준다. 여기서 그림을 정하면
 * 그 파일 그림보다 앞서 버리기 때문이다.
 */
export function shareMeta(title: string, description?: string, ownImage = false): Pick<Metadata, "openGraph"> {
  return {
    openGraph: {
      title,
      description,
      siteName: SITE_NAME,
      locale: "ko_KR",
      type: "website",
      // images 키가 있기만 해도(undefined라도) 그 폴더의 opengraph-image 그림이 빠져서, ownImage면 키를 아예 두지 않는다
      ...(ownImage
        ? {}
        : { images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE_NAME} — 해외파 한국 선수 기록 모아보기` }] }),
    },
  };
}
