// 우리가 호스팅하는 선수 사진(/photos/{이름})의 이름 규칙과, 작은 사진 원에 쓸 줄인 사진 주소(/photos/{이름}/{폭}).

/**
 * 사진 이름. mlb-808982(지금 MLB 사진), kbo-…(KBO 사진), posting-673490-2024(MLB 도전 선수 사진: 계약 구단 시절 MLB 사진의
 * 흰 바탕 편집본), career-67341-2023(선수 페이지 과거 소속팀 사진: MLB 사진과 같은 틀의 투명 바탕 편집본).
 * mlb-673490-2024(편집 전 그 시즌 MLB 사진)는 옛 api가 주던 이름이라 남겨 둔다
 */
export const PHOTO_KEY = /^(mlb-\d{1,10}(-\d{4})?|kbo-[a-z0-9-]{1,40}|posting-\d{1,10}-\d{4}|career-\d{1,10}-\d{4})$/;

/**
 * 줄인 사진의 폭(px). 아무 폭이나 받지 않고 이 사다리만 만든다(서버가 줄이는 일과 저장해 둘 사진 수를 묶어 둔다).
 * 원 지름 24~56px의 2배·3배 화면을 덮는다(그 배율 이상인 가장 작은 폭): 24 → 48·72, 28·30 → 72·96, 40 → 96·120, 44 → 96·168, 56 → 120·168
 */
export const SMALL_PHOTO_WIDTHS = [48, 72, 96, 120, 168] as const;

/** 이 지름(px)까지는 줄인 사진을 쓴다. 그보다 큰 사진(선수 페이지 96px, 무대 112px)은 원본 그대로 */
const SMALL_MAX = 56;

/** px 이상인 가장 작은 사다리 폭(넘으면 가장 큰 폭) */
function ladder(px: number): number {
  return SMALL_PHOTO_WIDTHS.find((w) => w >= px) ?? SMALL_PHOTO_WIDTHS[SMALL_PHOTO_WIDTHS.length - 1];
}

/**
 * 작은 사진 원(지름 56px 이하)에 쓸 img src·srcSet. 표·목록의 24px 원에도 원본(MLB 사진 360px, 장당 약 18KB)을 받던 것을
 * 화면 배율(2배·3배)에 맞춰 줄인 webp(장당 1~5KB)로 받는다(Lighthouse 'Properly size images', 전수조사).
 * 우리 사진(/photos/…)이 아니거나 큰 원이면 null(원본 주소 그대로 쓴다). 줄인 사진을 못 만들면 서버가 원본으로 넘긴다.
 */
export function smallPhoto(url: string | null, diameter: number): { src: string; srcSet: string } | null {
  if (!url || diameter > SMALL_MAX) return null;
  const key = url.startsWith("/photos/") ? url.slice("/photos/".length) : null;
  if (!key || !PHOTO_KEY.test(key)) return null;
  const x2 = ladder(diameter * 2);
  const x3 = ladder(diameter * 3);
  return { src: `${url}/${x2}`, srcSet: `${url}/${x2} 2x, ${url}/${x3} 3x` };
}
