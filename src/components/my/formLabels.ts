// '내 선수' 카드의 최근 폼 요약 문구(이슈 #13). 숫자·종류는 서버가 주고, 화면 문장은 여기서 만든다.
import type { CardBasis, CardStatus, LevelTotals, MyPlayer, PlayCode, PlayLine } from "@/lib/api";
import { formatDateRange, formatEra, formatRate } from "@/lib/format";

/** 마이너 단계 약어 → 화면 이름. 모르면 "마이너" */
const LEVEL_KO: Record<string, string> = {
  AAA: "트리플A",
  AA: "더블A",
  "A+": "하이A",
  A: "싱글A",
  ROK: "루키",
};

export function levelKo(level: string | null | undefined): string {
  if (level === "MLB") return "메이저";
  return (level && LEVEL_KO[level]) || "마이너";
}

/** 배지 색: 위기 빨강 · 복귀 초록 · 콜업 파랑 · 이적 보라 · 그 밖 회색(DESIGN.md 신호색) */
export type BadgeTone = "danger" | "success" | "accent" | "fa" | "neutral";

export function statusBadge(status: CardStatus): { text: string; tone: BadgeTone } | null {
  const days = status.days != null ? ` ${status.days}일째` : "";
  switch (status.kind) {
    case "IL":
      return { text: `부상자 명단${days}`, tone: "danger" };
    case "RETURNED":
      return { text: `부상 복귀${days}`, tone: "success" };
    case "CALLED_UP":
      return { text: `콜업${days}`, tone: "accent" };
    case "MINORS":
      return { text: status.level ? `마이너 · ${levelKo(status.level)}` : "마이너", tone: "neutral" };
    case "MINORS_IL":
      return { text: "마이너 부상자 명단", tone: "danger" };
    case "SUSPENDED":
      return { text: `출장 정지${days}`, tone: "danger" };
    case "DFA":
      return { text: `지명 할당(DFA)${days}`, tone: "danger" };
    case "FA":
      return { text: `FA${days}`, tone: "fa" };
    case "SEASON_OVER":
      return { text: "시즌 끝", tone: "neutral" };
    default:
      return null;
  }
}

/** 이름 아래 팀 줄: FA면 직전 소속 */
export function metaLine(entry: MyPlayer): string {
  const team = entry.player.teamKo;
  const parts = [entry.status?.kind === "FA" && team ? `직전 ${team}` : team, entry.player.positionKo];
  return parts.filter(Boolean).join(" · ");
}

/** "2026-08-27" → "8/27" */
function monthDay(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}/${Number(d)}`;
}

/**
 * 상태 줄(출전 줄 자리에 한 줄): 마이너면 소속 팀, FA면 마지막 경기. 메이저 출전 줄(playText)이 있으면 쓰지 않는다.
 */
export function statusLine(entry: MyPlayer): string | null {
  const status = entry.status;
  if (!status) return null;
  if ((status.kind === "MINORS" || status.kind === "MINORS_IL") && status.teamName) {
    return entry.basis === "NONE" ? `${status.teamName} 합류, 아직 경기 없음` : `${status.teamName} 소속`;
  }
  if (status.kind === "FA" && status.lastGameDate) {
    return `마지막 경기 ${monthDay(status.lastGameDate)} ${levelKo(status.lastGameLevel)}`;
  }
  return null;
}

/** 타자 출전 줄 글자: { label: "팀 최근 10경기", counts: "선발 9 · 교체 1 · 결장 0" } */
export function playText(play: PlayLine): { label: string; counts: string } | null {
  const recent = play.recent;
  if (!recent || recent.length === 0) return null;
  const count = (code: PlayCode) => recent.filter((c) => c === code).length;
  const after = play.after === "RETURNED" ? "복귀 후 " : play.after === "CALLED_UP" ? "콜업 후 " : "";
  const label = after ? `${after}팀 ${recent.length}경기` : `팀 최근 ${recent.length}경기`;
  const parts = [`선발 ${count("STARTER")}`, `교체 ${count("SUB")}`];
  // 선발·교체를 모르는 출전이 있을 때만 따로 센다
  if (count("PLAYED") > 0) parts.push(`출전 ${count("PLAYED")}`);
  parts.push(`결장 ${count("ABSENT")}`);
  return { label, counts: parts.join(" · ") };
}

/** 투수 출전 줄: "최근 14일 3번 등판 · 마지막 등판 2일 전" */
export function pitcherPlayText(play: PlayLine): string | null {
  if (play.appearances14 == null) return null;
  const last = play.daysSinceLast;
  const tail = last == null ? "" : ` · 마지막 등판 ${last === 0 ? "오늘" : `${last}일 전`}`;
  return `최근 14일 ${play.appearances14}번 등판${tail}`;
}

/** 큰 숫자 이름표 앞부분: "최근 7일", "트리플A 최근 7일", "다치기 전 7일", "마지막 7일" */
export function periodLabel(basis: CardBasis, level: string | null, days: number): string {
  const prefix = level && level !== "MLB" ? `${levelKo(level)} ` : "";
  const word = basis === "BEFORE_INJURY" ? "다치기 전" : basis === "LAST_PLAYED" ? "마지막" : "최근";
  return `${prefix}${word} ${days}일`;
}

/** 기간을 당긴 카드(마지막·다치기 전)의 기간 설명: "다치기 전 7일 · 9월 15일(화) ~ 21일(월)" */
export function periodNote(entry: MyPlayer, days: number): string | null {
  if (entry.basis === "LAST_PLAYED") return `마지막으로 뛴 ${days}일 · ${formatDateRange(entry.fromKst, entry.toKst)}`;
  if (entry.basis === "BEFORE_INJURY") return `다치기 전 ${days}일 · ${formatDateRange(entry.fromKst, entry.toKst)}`;
  return null;
}

/** 시즌 합계의 다른 단계 한 줄: "마이너 85경기 · 타율 .262 · 3홈런", "메이저 4번 등판 · 평균자책점 9.00" */
export function otherTotalsLine(totals: LevelTotals, pitcher: boolean): string {
  const name = levelKo(totals.level);
  if (pitcher) {
    const extra = [totals.saves > 0 ? `세이브 ${totals.saves}` : null, totals.holds > 0 ? `홀드 ${totals.holds}` : null]
      .filter(Boolean)
      .join(" · ");
    return `${name} ${totals.games}번 등판 · 평균자책점 ${formatEra(totals.era)}${extra ? ` · ${extra}` : ""}`;
  }
  return `${name} ${totals.games}경기 · 타율 ${formatRate(totals.avg)}${totals.homeRuns > 0 ? ` · ${totals.homeRuns}홈런` : ""}`;
}
