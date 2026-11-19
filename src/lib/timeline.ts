// 선수 탭 '어디서 뛰었나' 연표의 표시 계산. 띠 구간 자체는 서버(GET /api/players/timeline)가 만든 것을 그대로 쓰고,
// 여기서는 날짜를 띠 위 자리로 바꾸고, 띠 위 표시를 묶고, 사실 한 줄과 화면 낭독기용 요약 글을 만든다.
import type { RosterMove, TimelineKind, TimelineSegment } from "./api";

const DAY = 86_400_000;
const dayNum = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / DAY);

/** 띠가 덮는 날 수(양 끝 포함) */
export function bandDays(from: string, to: string): number {
  return Math.max(1, dayNum(to) - dayNum(from) + 1);
}

/** 날짜 → 띠 안 날 번호(0부터). 띠 밖이면 범위 안으로 자른다 */
export function dayIndex(from: string, to: string, date: string): number {
  return Math.min(bandDays(from, to) - 1, Math.max(0, dayNum(date) - dayNum(from)));
}

/** "2026-11-02" → "11월 2일" */
export function koDate(date: string): string {
  return `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`;
}

export const KIND_NAME: Record<TimelineKind, string> = { MLB: "메이저", MINORS: "마이너", INJURED: "부상", NO_TEAM: "팀 없음" };

/** 띠 요약(화면 낭독기용): '마이너 3월 1일~4월 4일, 메이저 4월 5일~5월 28일, …' */
export function bandSummary(segments: TimelineSegment[]): string {
  return segments.map((g) => `${KIND_NAME[g.kind]} ${koDate(g.from)}~${koDate(g.to)}`).join(", ");
}

export interface Marker {
  date: string;
  /** 같은 자리에 묶인 사건 이름들 */
  labels: string[];
  /** 띠 안 날 번호 */
  day: number;
}

// 트레이드·방출·DFA(지명 할당)·FA 선언·계약만 띠 위에 표시한다
const MARKED: Record<string, string> = { TR: "트레이드", REL: "방출", DES: "DFA", SFA: "계약" };

/** 띠 위 표시. 가까이(휴대폰에서 약 6px) 붙은 것은 하나로 묶는다 */
export function buildMarkers(moves: RosterMove[], from: string, to: string): Marker[] {
  const days = bandDays(from, to);
  const mergeDays = Math.max(1, Math.round((6 * days) / 319));
  const out: Marker[] = [];
  for (const m of moves) {
    if (m.date < from || m.date > to) continue;
    const label = m.typeCode === "DFA" ? "FA 선언" : MARKED[m.typeCode];
    if (!label) continue;
    const day = dayIndex(from, to, m.date);
    const text = `${label} ${Number(m.date.slice(5, 7))}/${Number(m.date.slice(8, 10))}`;
    const last = out[out.length - 1];
    if (last && day - last.day <= mergeDays) last.labels.push(text);
    else out.push({ date: m.date, labels: [text], day });
  }
  return out;
}

/**
 * 사실 한 줄 재료(이동 기록에서 센다). 가장 말할 만한 것부터:
 * 트레이드가 있으면 '트레이드 · 메이저 n일', 없고 방출·DFA가 있으면 그것, 없고 강등이 있으면 '강등 n번 · 콜업 n번',
 * 그 밖에는 '부상자 명단 n번'. FA 선언이 있으면 끝에 붙인다(국내 복귀(plainFa)면 날짜 없이 'FA').
 */
export function buildFacts(moves: RosterMove[], segments: TimelineSegment[], plainFa: boolean): string[] {
  const count = (f: (m: RosterMove) => boolean) => moves.filter(f).length;
  const trades = count((m) => m.typeCode === "TR");
  const released = count((m) => m.typeCode === "REL");
  const designated = count((m) => m.typeCode === "DES");
  const demoted = count((m) => m.typeCode === "OPT" || m.typeCode === "OUT");
  const called = count((m) => m.typeCode === "CU" || m.typeCode === "SE");
  const injured = count((m) => m.typeCode === "SC" && m.labelKo === "부상자 명단 등재");
  const fa = moves.filter((m) => m.typeCode === "DFA").sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const out: string[] = [];
  if (trades > 0) {
    // 메이저에 있던 날: 콜업 날부터 강등 날까지 양 끝을 센다(뒤에 다른 구간이 이어지면 그 첫날도 마지막 날로 센다)
    const major = segments.reduce(
      (sum, g, i) => (g.kind === "MLB" ? sum + bandDays(g.from, g.to) + (i + 1 < segments.length ? 1 : 0) : sum),
      0,
    );
    out.push("트레이드");
    if (major > 0) out.push(`메이저 ${major}일`);
  } else if (released > 0 || designated > 0) {
    if (released > 0) out.push(`방출 ${released}번`);
    if (designated > 0) out.push(`DFA ${designated}번`);
  } else if (demoted > 0) {
    out.push(`강등 ${demoted}번`, `콜업 ${called}번`);
  } else if (injured > 0) {
    out.push(`부상자 명단 ${injured}번`);
  }
  if (fa) out.push(plainFa ? "FA" : `${koDate(fa.date)} FA`);
  return out;
}

/** 달 눈금: 띠가 덮는 달마다 그 달 1일의 자리(첫 달은 띠 시작) */
export function monthTicks(from: string, to: string) {
  const ticks: { month: number; day: number }[] = [];
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7));
  const endKey = to.slice(0, 7);
  while (`${y}-${String(m).padStart(2, "0")}` <= endKey) {
    const first = `${y}-${String(m).padStart(2, "0")}-01`;
    ticks.push({ month: m, day: dayIndex(from, to, first < from ? from : first) });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return ticks;
}

