// 우리가 호스팅하는 선수 사진(/photos/{이름})의 이름 규칙과, 사진 원에 쓸 줄인 사진 주소(/photos/{이름}/{폭}).

/**
 * 사진 이름. mlb-808982(지금 MLB 사진), kbo-…(KBO 사진), posting-673490-2024(MLB 도전 선수 사진: 계약 구단 시절 MLB 사진의
 * 흰 바탕 편집본), career-67341-2023(선수 페이지 과거 소속팀 사진: MLB 사진과 같은 틀의 투명 바탕 편집본).
 * mlb-673490-2024(편집 전 그 시즌 MLB 사진)는 옛 api가 주던 이름이라 남겨 둔다
 */
export const PHOTO_KEY = /^(mlb-\d{1,10}(-\d{4})?|kbo-[a-z0-9-]{1,40}|posting-\d{1,10}-\d{4}|career-\d{1,10}-\d{4})$/;

/**
 * 우리 사진 주소: /photos/{이름} 또는 api가 내용 버전을 붙인 /photos/{이름}?v={sha256 앞 8자}. 버전은 사진 내용이 바뀌면 달라져서
 * 버전이 붙은 요청은 오래(immutable) 저장해도 옛 사진이 남지 않는다. 옛 api는 버전 없는 주소를 준다.
 */
export const PHOTO_PATH = /^\/photos\/([a-z0-9-]{1,60})(?:\?v=([0-9a-f]{8}))?$/;

/** 우리 사진 주소를 이름과 버전(없으면 null)으로 나눈다. 우리 사진 주소가 아니면 null */
export function parsePhotoPath(url: string | null | undefined): { key: string; version: string | null } | null {
  const match = url ? PHOTO_PATH.exec(url) : null;
  return match ? { key: match[1], version: match[2] ?? null } : null;
}

/** 배경 없는 MLB 사진(/photos/mlb-…)인지. 이 사진만 원 바탕을 팀 색으로 칠한다(KBO 사진은 배경이 있고, posting-…은 흰 바탕 편집본) */
export function isMlbPhoto(url: string | null | undefined): boolean {
  return parsePhotoPath(url)?.key.startsWith("mlb-") === true;
}

/** 요청의 v 값이 내용 버전 모양(16진수 8자)이면 그 값, 아니면 null(그 밖의 값은 api로 넘기지 않는다) */
export function photoVersion(value: string | null): string | null {
  return value && /^[0-9a-f]{8}$/.test(value) ? value : null;
}

/**
 * 줄인 사진의 폭(px). 아무 폭이나 받지 않고 이 사다리만 만든다(서버가 줄이는 일과 저장해 둘 사진 수를 묶어 둔다).
 * 원 지름 24~56px의 2배·3배 화면을 덮는다(그 배율 이상인 가장 작은 폭): 24 → 48·72, 28·30 → 72·96, 40 → 96·120, 44 → 96·168, 56 → 120·168.
 * 192·288은 선수 페이지 머리 사진 무대(96px 원)의 2배·3배다
 */
export const SMALL_PHOTO_WIDTHS = [48, 72, 96, 120, 168, 192, 288] as const;

/** 이 지름(px)까지는 줄인 사진을 쓴다(표·목록의 작은 원) */
const SMALL_MAX = 56;

/**
 * 선수 페이지 머리 사진 무대(PhotoStage)의 원 지름(px). 이 원도 줄인 사진을 쓴다: 원본은 MLB 사진 360px, 과거 소속팀 편집본
 * 288px PNG(장당 약 88KB)라 보이지 않는 소속팀 사진까지 받으면 무거웠다(전수조사 L341).
 * 그 밖의 큰 원(홈 MLB 도전 카드 76px, 내 선수 카드 무대 112px)은 원본 그대로다
 */
export const STAGE_DIAMETER = 96;

/** px 이상인 가장 작은 사다리 폭(넘으면 가장 큰 폭) */
function ladder(px: number): number {
  return SMALL_PHOTO_WIDTHS.find((w) => w >= px) ?? SMALL_PHOTO_WIDTHS[SMALL_PHOTO_WIDTHS.length - 1];
}

/**
 * 작은 사진 원(지름 56px 이하)과 선수 페이지 사진 무대(96px)에 쓸 img src·srcSet. 표·목록의 24px 원에도 원본(MLB 사진 360px,
 * 장당 약 18KB)을 받던 것을 화면 배율(2배·3배)에 맞춰 줄인 webp(작은 원 장당 1~5KB, 사진 무대 6~13KB)로 받는다
 * (Lighthouse 'Properly size images', 전수조사).
 * 우리 사진(/photos/…)이 아니거나 그 밖의 큰 원이면 null(원본 주소 그대로 쓴다). 줄인 사진을 못 만들면 서버가 원본으로 넘긴다.
 */
export function smallPhoto(url: string | null, diameter: number): { src: string; srcSet: string } | null {
  if (!url || (diameter > SMALL_MAX && diameter !== STAGE_DIAMETER)) return null;
  const parsed = parsePhotoPath(url);
  if (!parsed || !PHOTO_KEY.test(parsed.key)) return null;
  const base = `/photos/${parsed.key}`;
  const query = parsed.version ? `?v=${parsed.version}` : ""; // 버전을 줄인 사진 주소에도 그대로 유지한다
  const x2 = ladder(diameter * 2);
  const x3 = ladder(diameter * 3);
  return { src: `${base}/${x2}${query}`, srcSet: `${base}/${x2}${query} 2x, ${base}/${x3}${query} 3x` };
}
