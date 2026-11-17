import type { Metadata } from "next";
import type { NewsPage, PlayerResponse } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { splitSentences } from "@/lib/news";
import { mainSeasonStats } from "@/lib/seasonStats";

/**
 * 공유 미리보기(og:)와 공유 링크에 쓰는 사이트 주소. 그림 주소(og:image)를 절대 주소로 만드는 데 쓴다.
 * 서버 환경변수 SITE_URL로 바꿀 수 있다(시험 서버 등). 기본은 운영 주소.
 */
export const SITE_URL = process.env.SITE_URL ?? "https://pigeon.ddns.net";

export const SITE_NAME = "KOR Leaguer";

/** 사이트 설명. layout의 기본 description과 홈 공유 카드에 쓴다 */
export const SITE_DESCRIPTION = "해외파 한국 선수들의 최근 경기 기록과 시즌 성적을 모아 봐요.";

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

/** 선수 공유 그림과 그 대체 글이 읽는 선수 응답(GET /api/players/{id})의 부분 */
type PlayerShareData = Pick<PlayerResponse, "season" | "player" | "hitting" | "pitching" | "minorHitting" | "minorPitching">;

/**
 * 선수 공유 그림(app/players/[id]/og/[v]/route.tsx)에 그리는 글: 이름 아래 팀·포지션 줄과 주 단계 기록 세 칸.
 * 그림의 대체 글(playerShareImage)도 이 값으로 만들어 그림 속 글과 어긋나지 않게 한다.
 */
export function playerShareLines(data: PlayerShareData) {
  const { player } = data;
  // FA면 마지막 MLB 팀에 '전'(화면의 팀 알약과 같다, 문구 점검 11-13)
  const team = player.returnedKo ? `${player.returnedKo} 복귀` : player.freeAgent && player.teamKo ? `전 ${player.teamKo}` : player.teamKo;
  const subline = [team, player.positionKo, player.freeAgent && !player.returnedKo ? "FA" : null].filter(Boolean).join(" · ");
  // 선수 목록 카드와 같은 기록: 올해 주로 뛴 단계 + 단계·경기 수 이름표(이슈 #184)
  return { subline, main: mainSeasonStats(player, data) };
}

/**
 * 선수 페이지 공유 그림. 주소에 판 번호가 들어간다. 대체 글은 그림 속 글을 그 순서대로 읽는다:
 * '김혜성 · LA 다저스 · 유격수 · 트리플A 85경기 · 타율 .262 · 홈런 3 · OPS .674'(선수마다 다르다)
 */
export function playerShareImage(data: PlayerShareData): ShareImage {
  const { subline, main } = playerShareLines(data);
  // 기록이 없으면 그림에도 기록 칸 대신 '2026 시즌 기록 보기'가 있다
  const record = main ? [main.label, ...main.stats.map((s) => `${s.label} ${s.value}`)] : [`${data.season} 시즌 기록 보기`];
  return {
    url: `/players/${data.player.id}/og/${OG_VERSION}`,
    alt: [data.player.nameKo, subline, ...record].filter(Boolean).join(" · "),
  };
}

/** 기사 공유 그림과 그 대체 글이 읽는 기사 응답(GET /api/news/{id})의 부분 */
type NewsShareData = Pick<NewsPage, "id" | "publisher" | "publishedAt" | "title" | "titleKo" | "summary">;

/** 기사 공유 그림 아래쪽 안내. 요약이 있는 기사에만 그린다 */
export const NEWS_SUMMARY_CUE = "AI 요약으로 읽기";

/**
 * 기사 공유 그림(app/news/[id]/og/[v]/route.tsx)에 그리는 글: 언론사·날짜 줄, 제목(영어 기사는 옮긴 제목),
 * 'AI 요약으로 읽기'를 그릴지. 요약이 아직 없으면 기사 페이지는 기사 앞부분을 보여서 AI 요약을 약속하지 않는다.
 * 그림의 대체 글(newsShareImage)도 이 값으로 만든다.
 */
export function newsShareLines(news: NewsShareData) {
  return {
    source: `${news.publisher} · ${formatDate(news.publishedAt)}`,
    title: news.titleKo ?? news.title,
    // 기사 페이지가 'AI 요약'이라고 적는 조건과 같다(news/[id]/page.tsx Article)
    summary: splitSentences(news.summary).length > 0,
  };
}

/**
 * 기사 페이지 공유 그림. 주소에 판 번호가 들어간다. 대체 글은 그림 속 글(언론사·날짜, 제목, 요약이 있으면 'AI 요약으로 읽기').
 * 제목은 그림에서 세 줄로 잘려도 끝까지 적는다
 */
export function newsShareImage(news: NewsShareData): ShareImage {
  const { source, title, summary } = newsShareLines(news);
  return {
    url: `/news/${news.id}/og/${OG_VERSION}`,
    alt: [source, title, summary ? NEWS_SUMMARY_CUE : null].filter(Boolean).join(" · "),
  };
}

/**
 * 화면별 공유 미리보기 정보. 페이지에서 openGraph를 정하면 layout의 openGraph를 통째로 덮어써서(기본 그림까지 빠진다),
 * 사이트 이름·언어·종류와 그림을 매번 함께 넣는다. 그림을 주지 않으면 사이트 기본 그림(app/opengraph-image.tsx,
 * 주소는 /opengraph-image/<OG_VERSION>)이다. 선수·기사는 playerShareImage·newsShareImage를 준다.
 * - title: 화면 제목만('선수'). 사이트 이름은 og:site_name으로 따로 붙어서, 넣으면 카드에 'KOR Leaguer'가 두 번 보인다
 *   (앱 공유 버튼도 제목에서 ' · KOR Leaguer'를 떼고 보낸다, ShareButton)
 * - path: 이 화면 주소(og:url, layout의 metadataBase로 절대 주소가 된다). 주소 뒤 ?값이 보이는 내용을 고르면 그 값까지
 *   넣거나(선수 화면의 경기 상세 창 /players/{id}?game=) 주지 않는다(/news?player=, /records?stat=). 빠뜨리면 og:url을
 *   따르는 서비스(페이스북 등)가 거른 링크를 거르지 않은 화면으로 연다. 카카오도 공유한 주소와 og:url을 같게 하거나 빼라고 안내한다
 */
export function shareMeta(
  title: string,
  description?: string,
  path?: string,
  image: ShareImage = { url: `/opengraph-image/${OG_VERSION}`, alt: SITE_IMAGE_ALT },
): Pick<Metadata, "openGraph"> {
  return {
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "ko_KR",
      type: "website",
      images: [{ ...image, width: 1200, height: 630, type: "image/png" }],
    },
  };
}
