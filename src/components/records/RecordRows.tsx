import Link from "next/link";
import type { ReactNode } from "react";
import type { RecordBest, RecordLeader, RecordNext, RecordPassed } from "@/lib/api";
import Chevron from "@/components/Chevron";
import PlayerAvatar from "@/components/PlayerAvatar";

/** 1671 → "1,671" */
export function count(value: number): string {
  return value.toLocaleString("ko-KR");
}

/** 뛴 시즌: "2005–20", 한 시즌이면 "2016" */
function years(first: number, last: number): string {
  if (!first) return "";
  return first === last ? String(first) : `${first}–${String(last).slice(-2)}`;
}

/** "2026-05-17" → "5월 17일" */
export function monthDay(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}월 ${Number(d)}일`;
}

/**
 * 명단 선수면 선수 화면으로, 아니면 그냥 줄.
 * 큰 글씨(앱 2배)에서는 한 줄에 다 들어가지 않는다. 그때 이름 칸이 한두 글자 폭으로 찌그러지지 않게 줄을 접어
 * 오른쪽 값·날짜를 다음 줄로 내린다(flex-wrap, 이슈 #264). 언제 접을지는 줄마다 칸의 기본 폭(basis)으로 정한다
 */
function RowShell({ playerId, children }: { playerId: number | null; children: ReactNode }) {
  const className = "flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5";
  return playerId != null ? (
    <Link href={`/players/${playerId}`} className={`press-soft ${className}`}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}

/**
 * 순위 줄 오른쪽 끝: 값 묶음 + 선수 화면으로 가는 줄(명단 선수)에만 ›.
 * 순위에는 지난 선수가 많아 못 누르는 줄이 더 많은데(11-17 통산 안타 14명 중 9명, 승·세이브는 모두) 모양이 같아서
 * 눌러 봐야 알았다(11-17 UI/UX 전수조사). 못 누르는 줄은 › 폭만큼 비워 값 끝을 줄마다 맞춘다.
 * ›를 값과 한 덩어리로 둬서 큰 글씨에서 값이 다음 줄로 내려가면 함께 내려간다.
 * 넘은·넘을 기록 줄은 모두 누를 수 있어 ›를 두지 않는다(다른 목록 카드처럼)
 */
function RowEnd({ linked, children }: { linked: boolean; children: ReactNode }) {
  return (
    <span className="ml-auto flex shrink-0 items-center gap-1.5">
      {children}
      {linked ? <Chevron /> : <span className="w-3 shrink-0" />}
    </span>
  );
}

function ActiveTag() {
  return <span className="rounded-md bg-accent-soft px-1.5 text-badge text-accent-ink">현역</span>;
}

/** 통산 순위 한 줄: 등수 · 사진 · 이름(현역 표시 또는 뛴 해) · 값 */
export function LeaderRow({ leader, unit }: { leader: RecordLeader; unit: string }) {
  return (
    <li className={leader.active ? "bg-accent-soft/40" : undefined}>
      <RowShell playerId={leader.playerId}>
        <span
          className={`w-6 shrink-0 text-center text-heading tabular-nums ${leader.active ? "text-accent-ink" : "text-muted"}`}
        >
          {leader.rank}
          {/* 낭독기는 '6 이정후'가 아니라 '6위 이정후'로(역대 포스팅 계약 목록과 같은 방식) */}
          <span className="sr-only">위</span>
        </span>
        <PlayerAvatar nameKo={leader.nameKo} photoUrl={leader.photoUrl} teamAbbr={null} size={28} />
        {/* 이름 칸 기본 폭 3.5rem(세 글자 이름): 이만큼도 안 남으면 값이 다음 줄 오른쪽으로 내려간다 */}
        <span className="flex min-w-0 flex-1 basis-[3.5rem] flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-heading">{leader.nameKo}</span>
          {leader.active ? (
            <ActiveTag />
          ) : (
            <span className="text-caption text-muted tabular-nums">{years(leader.firstSeason, leader.lastSeason)}</span>
          )}
        </span>
        <RowEnd linked={leader.playerId != null}>
          <span className="text-stat tabular-nums">
            {count(leader.value)}
            <span className="sr-only">{unit}</span>
          </span>
        </RowEnd>
      </RowShell>
    </li>
  );
}

/**
 * 다음에 넘을 기록 한 줄: 사진 · 지금 값 · 누구를 넘으면 몇 위 · 남은 수.
 * 진행 막대(지금 값 ÷ 넘을 값)는 뺐다. api가 선수마다 남은 비율이 가장 작은 기록을 먼저 주므로 막대가 늘 85~95%에 몰려
 * 차이가 안 보였고, 남은 수가 가장 적은 선수의 막대가 가장 짧기도 해서 큰 남은 수와 거꾸로 읽혔다(11-17 UI/UX 전수조사)
 */
export function NextRow({ next }: { next: RecordNext }) {
  return (
    <li>
      <RowShell playerId={next.playerId}>
        <PlayerAvatar nameKo={next.nameKo} photoUrl={next.photoUrl} teamAbbr={null} size={44} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="min-w-0 flex-1 basis-[6rem]">
              <span className="text-heading">{next.nameKo}</span>{" "}
              {/* '통산 226타점'은 한 덩어리로(큰 글씨에서 '통산/226타점'으로 갈리지 않게) */}
              <span className="whitespace-nowrap text-meta text-muted tabular-nums">
                통산 {count(next.value)}
                {next.unit}
              </span>
            </span>
            <span className="ml-auto shrink-0 text-stat text-accent-ink tabular-nums">
              {count(next.toPass)}
              {next.unit}
              {/* 화면에서는 묶음 머리의 '남은 수'가 이 칸 이름이다. 낭독기는 '통산 336안타 32안타'로 이어 읽어 헷갈려서 '남음'을 붙인다 */}
              <span className="sr-only"> 남음</span>
            </span>
          </span>
          <span className="mt-0.5 block text-meta text-muted">
            {`${next.targetNameKo} ${count(next.targetValue)}${next.unit} 넘으면 한국인 ${next.rankAfter}위`}
          </span>
        </span>
      </RowShell>
    </li>
  );
}

/** 넘은 기록: 선수·기록마다 한 줄로 묶는다(이정후 안타: 최희섭 220 · 강정호 233) */
export interface PassedGroup {
  key: string;
  first: RecordPassed;
  items: RecordPassed[];
}

export function groupPassed(passed: RecordPassed[]): PassedGroup[] {
  const groups = new Map<string, PassedGroup>();
  for (const p of passed) {
    const key = `${p.nameKo}|${p.category}`;
    const group = groups.get(key);
    if (group) group.items.push(p);
    else groups.set(key, { key, first: p, items: [p] });
  }
  return [...groups.values()];
}

function when(items: RecordPassed[]): string {
  if (items.length === 1) return monthDay(items[0].dateKst);
  const months = [...new Set(items.map((p) => Number(p.dateKst.split("-")[1])))].sort((a, b) => a - b);
  return months.length === 1 ? `${months[0]}월` : `${months[0]}–${months[months.length - 1]}월`;
}

export function PassedRow({ group }: { group: PassedGroup }) {
  const { first, items } = group;
  // 넘은 순서대로(작은 값부터) 읽히게
  const names = [...items].sort((a, b) => a.passedValue - b.passedValue);
  // 줄 폭이 18rem보다 좁으면(큰 글씨) 넘은 선수 이름들을 둘째 줄로 내려 줄 폭을 다 쓴다. 한 줄에 두면 이름들 칸이
  // 한두 글자 폭이 돼 열 줄 넘게 세로로 늘어졌다(1.5배에서 17줄, 이슈 #264). 보통 크기 휴대폰(19rem 이상)은 그대로다
  return (
    <li className="@container">
      <RowShell playerId={first.playerId}>
        <PlayerAvatar nameKo={first.nameKo} photoUrl={first.photoUrl} teamAbbr={null} size={28} />
        <span className="w-12 shrink-0 text-heading @max-[18rem]:w-auto">{first.nameKo}</span>
        {/* 기록 이름표는 누르는 것이 아니라 흐린 글자로 둔다(알약은 누르는 것·드문 상태만, 사용자 규칙 11-17) */}
        <span className="shrink-0 text-label text-neutral-pill-fg">{first.label}</span>
        <span className="min-w-0 flex-1 text-meta tabular-nums @max-[18rem]:order-last @max-[18rem]:basis-full @max-[18rem]:pl-[calc(28px+0.75rem)]">
          {names.map((p) => `${p.passedNameKo} ${count(p.passedValue)}`).join(" · ")}
        </span>
        <span className="shrink-0 text-caption text-muted tabular-nums @max-[18rem]:ml-auto">{when(items)}</span>
      </RowShell>
    </li>
  );
}

/**
 * 한 시즌 최다 한 줄. 화면에서는 위 알약(고른 기록)과 칸 자리로 단위·시즌인 줄 알지만, 낭독기는 '이정후 2025 149'로만 읽어서
 * '시즌'과 단위를 낭독기에만 붙인다('2025시즌 149안타', 통산 순위 줄과 같은 방식)
 */
export function BestRow({ row, unit }: { row: RecordBest["rows"][number]; unit: string }) {
  return (
    <li className={row.active ? "bg-accent-soft/40" : undefined}>
      <RowShell playerId={row.playerId}>
        <span
          className={`w-6 shrink-0 text-center text-heading tabular-nums ${row.active ? "text-accent-ink" : "text-muted"}`}
        >
          {row.rank}
          <span className="sr-only">위</span>
        </span>
        <span className="min-w-0 flex-1 basis-[3.5rem] text-heading">{row.nameKo}</span>
        {/* 시즌·값·›는 붙여 둔다: 이름 칸이 모자라면 함께 다음 줄 오른쪽으로 내려간다 */}
        <RowEnd linked={row.playerId != null}>
          <span className="flex items-baseline gap-3">
            <span className="text-caption text-muted tabular-nums">
              {row.season}
              <span className="sr-only">시즌</span>
            </span>
            <span className="w-14 text-right text-stat tabular-nums">
              {count(row.value)}
              <span className="sr-only">{unit}</span>
            </span>
          </span>
        </RowEnd>
      </RowShell>
    </li>
  );
}
