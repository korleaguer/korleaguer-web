// 숫자·날짜를 화면용 문자열로 바꾸는 함수들. 값이 없거나 이상하면 "-"를 돌려준다.
import type { GameLine } from "./api";

const KST = "Asia/Seoul";

const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KST,
  month: "numeric",
  day: "numeric",
  weekday: "short",
});

const timeFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KST,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** 문자열을 Date로. 비었거나 날짜가 아니면 null */
function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  // "2026-09-27"처럼 날짜만 오면 한국 날짜로 읽는다.
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+09:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function part(parts: Intl.DateTimeFormatPart[], type: string): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

/** "9월 27일(일)" */
export function formatDate(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "-";
  const parts = dateFormat.formatToParts(date);
  return `${part(parts, "month")}월 ${part(parts, "day")}일(${part(parts, "weekday")})`;
}

/** 기간: "9월 21일(월) ~ 27일(일)". 달이 다르면 "8월 31일(월) ~ 9월 6일(일)" */
export function formatDateRange(from: string, to: string): string {
  const start = formatDate(from);
  const end = formatDate(to);
  if (start === "-" || end === "-") return "-";
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  return `${start} ~ ${sameMonth ? end.replace(/^\d+월 /, "") : end}`;
}

/** 선발·교체: 타자는 "선발"/"교체", 투수는 "선발"/"구원". 모르면 null (부르는 쪽에서 뺀다) */
export function formatLineup(line: Pick<GameLine, "lineup" | "role">): string | null {
  if (line.lineup === "STARTER") return "선발";
  if (line.lineup === "SUB") return line.role === "PITCHER" ? "구원" : "교체";
  return null;
}

/** 경기 기록 왼쪽 작은 날짜: "9.27" */
export function formatShortDate(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "-";
  const parts = dateFormat.formatToParts(date);
  return `${part(parts, "month")}.${part(parts, "day")}`;
}

/** 요일 한 글자: "일" */
export function formatWeekday(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "-";
  return part(dateFormat.formatToParts(date), "weekday");
}

/** "05:05" */
export function formatTime(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "-";
  const parts = timeFormat.formatToParts(date);
  return `${part(parts, "hour")}:${part(parts, "minute")}`;
}

/**
 * 한 줄 기록 문장. 괄호 안("(2루타 1)")에서는 줄이 바뀌지 않게 띄어쓰기를 줄바꿈 없는 공백으로 바꾼다.
 * "4타수 2안타(2루타 / 1) ..."처럼 괄호가 두 줄로 갈리는 것을 막는다.
 */
export function formatSummary(summary: string): string {
  return summary.replace(/\([^)]*\)/g, (group) => group.replace(/ /g, " "));
}

/** 타율·OPS 등 비율: 0.276 → ".276", 1.05 → "1.050", null → "-" */
export function formatRate(value: number | null): string {
  if (value == null) return "-";
  return value.toFixed(3).replace(/^0\./, ".");
}

/** 평균자책점: 4.756 → "4.76", null → "-" */
export function formatEra(value: number | null): string {
  return value == null ? "-" : value.toFixed(2);
}

/** "5 - 3" (우리 팀 - 상대 팀). 경기 전이라 점수가 없으면 null (부르는 쪽에서 점수 부분을 뺀다) */
export function formatScore(
  line: Pick<GameLine, "teamScore" | "opponentScore">,
): string | null {
  if (line.teamScore == null || line.opponentScore == null) return null;
  return `${line.teamScore} - ${line.opponentScore}`;
}

/** 만 나이: 28 → "만 28세". 없으면 null (부르는 쪽에서 그 칸을 뺀다) */
export function formatAge(age: number | null): string | null {
  return age == null ? null : `만 ${age}세`;
}

/** "1998-08-20" → "1998.08.20". 날짜 모양이 아니면 null */
export function formatBirthDate(value: string | null): string | null {
  const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
}

/** 키·몸무게: "188cm · 86kg". 하나만 있으면 그것만, 둘 다 없으면 null */
export function formatBody(heightCm: number | null, weightKg: number | null): string | null {
  const parts = [
    heightCm != null && `${Math.round(heightCm)}cm`,
    weightKg != null && `${Math.round(weightKg)}kg`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * 이름 뒤에 붙는 '을/를'. 마지막 글자에 받침이 있으면 '을'(고우석을), 없으면 '를'(이정후를).
 * 한글이 아닌 글자로 끝나면 '를'로 둔다.
 */
export function withObjectParticle(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0;
  return `${word}${hasFinal ? "을" : "를"}`;
}
