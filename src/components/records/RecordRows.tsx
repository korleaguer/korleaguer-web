import Link from "next/link";
import type { ReactNode } from "react";
import type { RecordBest, RecordLeader, RecordNext, RecordPassed } from "@/lib/api";
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

/** 명단 선수면 선수 화면으로, 아니면 그냥 줄 */
function RowShell({ playerId, children }: { playerId: number | null; children: ReactNode }) {
  const className = "flex min-h-14 items-center gap-3 px-4 py-2.5";
  return playerId != null ? (
    <Link href={`/players/${playerId}`} className={`press-soft ${className}`}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
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
        </span>
        <PlayerAvatar nameKo={leader.nameKo} photoUrl={leader.photoUrl} teamAbbr={null} size={28} />
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-heading">{leader.nameKo}</span>
          {leader.active ? (
            <ActiveTag />
          ) : (
            <span className="text-caption text-muted tabular-nums">{years(leader.firstSeason, leader.lastSeason)}</span>
          )}
        </span>
        <span className="shrink-0 text-stat tabular-nums">
          {count(leader.value)}
          <span className="sr-only">{unit}</span>
        </span>
      </RowShell>
    </li>
  );
}

/** 다음 선배 한 줄: 사진 · 지금 값 · 누구를 넘으면 몇 위 · 남은 수 · 막대 */
export function NextRow({ next }: { next: RecordNext }) {
  const pct = Math.min(100, Math.round((next.value / next.targetValue) * 100));
  return (
    <li>
      <RowShell playerId={next.playerId}>
        <PlayerAvatar nameKo={next.nameKo} photoUrl={next.photoUrl} teamAbbr={null} size={44} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="min-w-0">
              <span className="text-heading">{next.nameKo}</span>{" "}
              <span className="text-meta text-muted tabular-nums">
                통산 {count(next.value)}
                {next.unit}
              </span>
            </span>
            <span className="shrink-0 text-stat text-accent-ink tabular-nums">
              {count(next.toPass)}
              {next.unit}
            </span>
          </span>
          <span className="mt-0.5 block text-meta text-muted">
            {`${next.targetNameKo} ${count(next.targetValue)}${next.unit} 넘으면 한국인 ${next.rankAfter}위`}
          </span>
          <span aria-hidden className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </span>
        </span>
      </RowShell>
    </li>
  );
}

/** 넘은 선배: 선수·기록마다 한 줄로 묶는다(이정후 안타: 최희섭 220 · 강정호 233) */
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
  return (
    <li>
      <RowShell playerId={first.playerId}>
        <PlayerAvatar nameKo={first.nameKo} photoUrl={first.photoUrl} teamAbbr={null} size={28} />
        <span className="w-12 shrink-0 text-heading">{first.nameKo}</span>
        <span className="shrink-0 rounded-full bg-surface-2 px-2 text-label text-neutral-pill-fg">{first.label}</span>
        <span className="min-w-0 flex-1 text-meta tabular-nums">
          {names.map((p) => `${p.passedNameKo} ${count(p.passedValue)}`).join(" · ")}
        </span>
        <span className="shrink-0 text-caption text-muted tabular-nums">{when(items)}</span>
      </RowShell>
    </li>
  );
}

/** 한 시즌 최다 한 줄 */
export function BestRow({ row }: { row: RecordBest["rows"][number] }) {
  return (
    <li className={row.active ? "bg-accent-soft/40" : undefined}>
      <RowShell playerId={row.playerId}>
        <span
          className={`w-6 shrink-0 text-center text-heading tabular-nums ${row.active ? "text-accent-ink" : "text-muted"}`}
        >
          {row.rank}
        </span>
        <span className="min-w-0 flex-1 text-heading">{row.nameKo}</span>
        <span className="shrink-0 text-caption text-muted tabular-nums">{row.season}</span>
        <span className="w-14 shrink-0 text-right text-stat tabular-nums">{count(row.value)}</span>
      </RowShell>
    </li>
  );
}
