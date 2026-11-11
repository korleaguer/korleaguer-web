// 관련 기사를 화면에 맞게 고르고 다듬는 함수들(서버·브라우저 어디서나 쓴다).

/** 기사 페이지는 요약이 없을 때 앞부분을 이 글자 수 안에서 문장이 끝나는 곳까지 보인다(피드가 주는 200자 안팎을 거의 다) */
export const LEAD_CHARS = 300;

/** 여는·닫는 따옴표 짝이 맞는지(“” 수가 같고 " 수가 짝수) */
function balancedQuotes(s: string): boolean {
  const open = s.match(/“/g)?.length ?? 0;
  const close = s.match(/”/g)?.length ?? 0;
  const straight = s.match(/"/g)?.length ?? 0;
  return open === close && straight % 2 === 0;
}

/**
 * 앞부분 맨 앞의 기자 표시. 둘 다 빼 본다.
 * - 괄호 안에 기자가 있는 꼴: (엑스포츠뉴스 이우진 기자), [OSEN=홍길동 특파원], (홍길동 기자 hong@…)
 * - 통신사 꼴: (서울=연합뉴스) 홍길동 기자 = , 【서울=뉴시스】홍길동 기자 =
 * [기자수첩]·(사진=한화 이글스 제공) 같은 말머리·사진 설명은 남는다.
 */
const BYLINES = [
  /^[(\[［【（][^)\]］】）]{1,40}(?:기자|특파원|통신원)[^)\]］】）]{0,40}[)\]］】）]\s*/,
  /^[(\[［【（][^)\]］】）]{1,20}=[^)\]］】）]{1,20}[)\]］】）]\s*(?:[가-힣A-Za-z]{2,10}\s*){0,3}(?:기자|특파원|통신원)\s*=\s*/,
];

/** 짝이 맞는 문장 끝으로 볼 만큼 짧은 앞부분의 최소 글자 수(이보다 짧게 자르면 LEAD_CHARS 뒤 문장 끝을 쓴다) */
const MIN_LEAD = 40;

/**
 * 기사 앞부분을 카드에 맞게 다듬는다.
 * - 제목과 앞부분이 둘 다 인용구로 시작하면(마이데일리처럼 제목의 인용구로 기사를 여는 경우) 그 인용구 문장은 뺀다.
 *   닫는 따옴표 바로 뒤에 글자가 붙으면(“…”고 말했다) 문장의 일부라 빼지 않는다.
 * - 문장 끝(마침표, 닫는 따옴표까지) 가운데 따옴표 짝이 맞는 곳에서만 자른다(따옴표 안에서 자르지 않게).
 *   LEAD_CHARS 안의 마지막 문장 끝을 쓰고, 그것이 너무 짧거나 없으면 LEAD_CHARS 뒤의 첫 문장 끝을 쓴다.
 *   알맞은 문장 끝이 없으면 그대로 둔다.
 */
export function readableLead(lead: string, title: string): string {
  // 맨 앞 기자 표시: (엑스포츠뉴스 이우진 기자), [OSEN=홍길동 특파원] 등. 언론사는 화면에 따로 보인다
  let text = BYLINES.reduce((s, byline) => s.replace(byline, "").trim(), lead.trim());
  const quote = /^[“"][^”"]{2,120}[”"](?:\s+|$)/.exec(text);
  if (quote && /^[“"]/.test(title.trim()) && text.length > quote[0].length) {
    text = text.slice(quote[0].length).trim();
  }
  if (text.length <= LEAD_CHARS && balancedQuotes(text)) return text;
  const ends: number[] = [];
  for (const m of text.matchAll(/\.[”"]?(?=\s|$)/g)) {
    const end = m.index + m[0].length;
    if (balancedQuotes(text.slice(0, end))) ends.push(end);
  }
  const within = ends.filter((end) => end <= LEAD_CHARS).at(-1);
  if (within !== undefined && within >= MIN_LEAD) return text.slice(0, within);
  const after = ends.find((end) => end > LEAD_CHARS);
  if (after !== undefined) return text.slice(0, after);
  return within !== undefined ? text.slice(0, within) : text;
}

/**
 * 요약(또는 기사 앞부분)을 기사 본문처럼 문장마다 한 단락으로 나눈다. 빈 줄은 뺀다.
 * 요약 모델에 한 줄에 한 문장씩 쓰라고 해도 여러 문장을 한 줄에 붙여 쓰는 일이 많아서(11-12 운영 요약 29건 중 15건)
 * 줄바꿈과 한국어 문장 끝(한글 + 마침표 + 빈칸) 모두에서 나눈다. 숫자(0.283)·영문 약어(Jr.)·따옴표 안
 * 마침표(…하겠다." 그는)는 마침표 앞이 한글이 아니거나 뒤가 빈칸이 아니라 나누지 않는다.
 */
export function splitSentences(text: string | null): string[] {
  return (text ?? "")
    .split("\n")
    .flatMap((line) => line.split(/(?<=[가-힣]\.)\s+/))
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** 읽을거리가 많은 쪽: 요약 > 앞부분 > 사진 */
function richness(n: { summary: string | null; lead: string | null; imageUrl: string | null }): number {
  return (n.summary ? 4 : 0) + (n.lead ? 2 : 0) + (n.imageUrl ? 1 : 0);
}

/**
 * 같은 기사(주소)가 여러 선수에게 걸려 있으면 하나만 남긴다. 서버는 선수마다 따로 요약하므로,
 * 한쪽만 요약된 동안에도 요약이 있는 사본을 남긴다.
 */
export function uniqueByUrl<T extends { url: string; summary: string | null; lead: string | null; imageUrl: string | null }>(
  items: T[],
): T[] {
  const byUrl = new Map<string, T>();
  for (const n of items) {
    const kept = byUrl.get(n.url);
    if (!kept || richness(n) > richness(kept)) byUrl.set(n.url, n);
  }
  return [...byUrl.values()];
}
