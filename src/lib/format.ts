// 숫자·날짜를 화면용 문자열로 바꾸는 함수들. 값이 없거나 이상하면 "-"를 돌려준다.
import type { GameLine, HitterSeason, PitcherSeason } from "./api";

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

/** "05:05" */
export function formatTime(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "-";
  const parts = timeFormat.formatToParts(date);
  return `${part(parts, "hour")}:${part(parts, "minute")}`;
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

/** "5 : 3". 경기 전이라 점수가 없으면 null (부르는 쪽에서 점수 부분을 뺀다) */
export function formatScore(
  line: Pick<GameLine, "teamScore" | "opponentScore">,
): string | null {
  if (line.teamScore == null || line.opponentScore == null) return null;
  return `${line.teamScore} : ${line.opponentScore}`;
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

/** 선수 카드의 타자 시즌 한 줄: "타율 .276 · 10홈런 · OPS .812" */
export function formatHitterLine(h: HitterSeason): string {
  return `타율 ${formatRate(h.avg)} · ${h.homeRuns}홈런 · OPS ${formatRate(h.ops)}`;
}

/** 선수 카드의 투수 시즌 한 줄: "평균자책 3.21 · 5승 3패 · 50삼진" */
export function formatPitcherLine(p: PitcherSeason): string {
  return `평균자책 ${formatEra(p.era)} · ${p.wins}승 ${p.losses}패 · ${p.strikeouts}삼진`;
}
