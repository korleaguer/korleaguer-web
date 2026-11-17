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
 * 한 줄 기록 문장. 괄호 안의 '이름 숫자'("2루타 1")는 줄이 바뀌지 않게 띄어쓰기를 줄바꿈 없는 공백으로 바꾼다.
 * "4타수 2안타(2루타 / 1) ..."처럼 이름과 숫자가 갈리는 것을 막는다. 쉼표 뒤("(2루타 1, 홈런 1)")는 줄바꿈 자리로 남긴다
 * (괄호 전체를 붙이면 큰 글씨에서 한 덩어리가 줄보다 길어진다). 아이폰(WebKit)은 여는 괄호 뒤('2안타(' / '2루타 1)')에서도
 * 줄을 바꾸므로 화면에는 Words로 감싸 그린다(이슈 #264).
 */
export function formatSummary(summary: string): string {
  return summary.replace(/\([^)]*\)/g, (group) => group.replace(/([^,]) /g, "$1\u00a0"));
}

/** 타율·OPS 등 비율: 0.276 → ".276", 1.05 → "1.050", null → "-" */
export function formatRate(value: number | null): string {
  if (value == null) return "-";
  return value.toFixed(3).replace(/^0\./, ".");
}

/**
 * WAR(소수 한 자리): 3.24 → "3.2", -0.4 → "−0.4", null → "-".
 * 음수는 하이픈이 아니라 빼기 글자(−)로 쓴다. 홈 성적표만 하이픈이라 선수 화면('−0.4')과 달랐다(전수조사).
 * 반올림해 0이 되면 "−0.0" 대신 "0.0"
 */
export function formatWar(value: number | null): string {
  if (value == null) return "-";
  const fixed = value.toFixed(1);
  return Number(fixed) === 0 ? "0.0" : fixed.replace("-", "−");
}

/** 아웃 수 → 이닝 글자: 152 → "50⅔", null → "-" */
export function formatInningsOuts(outs: number | null): string {
  if (outs == null) return "-";
  const rest = outs % 3;
  return `${Math.floor(outs / 3)}${rest === 1 ? "⅓" : rest === 2 ? "⅔" : ""}`;
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

/** 키·몸무게: "188cm 86kg"(가운뎃점으로 나눈 정보 줄 안에 들어가서 둘 사이는 띄어쓰기). 하나만 있으면 그것만, 둘 다 없으면 null */
export function formatBody(heightCm: number | null, weightKg: number | null): string | null {
  const parts = [
    heightCm != null && `${Math.round(heightCm)}cm`,
    weightKg != null && `${Math.round(weightKg)}kg`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

/** 마지막 글자가 받침 있는 한글인지. 한글이 아닌 글자로 끝나면 false */
function endsWithFinalConsonant(word: string): boolean {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}

/**
 * 이름 뒤에 붙는 '을/를'. 마지막 글자에 받침이 있으면 '을'(고우석을), 없으면 '를'(이정후를).
 * 한글이 아닌 글자로 끝나면 '를'로 둔다.
 */
export function withObjectParticle(word: string): string {
  return `${word}${endsWithFinalConsonant(word) ? "을" : "를"}`;
}

/** '과/와': 보스턴과, 시애틀과, 뉴욕 메츠와(받침이 없으면 '와') */
export function withAndParticle(word: string): string {
  return `${word}${endsWithFinalConsonant(word) ? "과" : "와"}`;
}

/** '은/는': 보스턴은, 뉴욕 메츠는(받침이 없으면 '는') */
export function withTopicParticle(word: string): string {
  return `${word}${endsWithFinalConsonant(word) ? "은" : "는"}`;
}

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: KST, year: "numeric", month: "2-digit", day: "2-digit" });

/** 한국 날짜 열쇠 "2026-11-15"(날짜별로 묶을 때). 모르는 값이면 null */
export function kstDayKey(value: string | Date | null | undefined): string | null {
  const date = value instanceof Date ? value : toDate(value);
  return date ? dayKeyFormat.format(date) : null;
}
