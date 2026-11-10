"use client"; // 막대를 누르면 아래 한 줄을 그 경기로 바꿔야 해서 클라이언트 컴포넌트다.

import { useState, type CSSProperties } from "react";
import type { GameLine, Role } from "@/lib/api";
import { formatDate, formatLineup, formatShortDate, formatSummary, formatWeekday } from "@/lib/format";
import ResultPill from "@/components/ResultPill";
import Highlights from "@/components/Highlights";
import ScoreText from "@/components/ScoreText";
import type { BarSlot } from "./columns";

interface Props {
  slots: BarSlot[];
  role: Role;
  /** 기간 일수(7·14·30). 막대 아래 날짜를 얼마나 촘촘히 쓸지 정한다 */
  days: number;
}

/** 막대 높이에 쓰는 값: 타자는 안타 수, 투수는 잡은 아웃 수. 모르면 null */
function barValue(game: GameLine, role: Role): number | null {
  return role === "PITCHER" ? (game.pitching?.outs ?? null) : (game.batting?.hits ?? null);
}

/** 화면 낭독기용 막대 설명: "9월 27일(일) 콜로라도전 2안타 1홈런" */
function barLabel(game: GameLine, role: Role): string {
  const lineup = formatLineup(game);
  const head = `${formatDate(game.startTimeKst)} ${game.opponentKo}전${lineup ? ` ${lineup}` : ""}`;
  if (!game.played) return `${head} ${game.summary}`;
  if (role === "PITCHER") {
    const innings = game.pitching?.inningsText;
    return innings ? `${head} ${innings}이닝` : `${head} 등판`;
  }
  const b = game.batting;
  if (!b) return `${head} 출전`;
  return `${head} ${b.hits}안타${b.homeRuns > 0 ? ` ${b.homeRuns}홈런` : ""}`;
}

/** 처음 고를 막대: 끝났거나 뛴 경기 중 가장 최근. 없으면 가장 최근 경기 */
function defaultIndex(slots: BarSlot[]): number {
  let latest = -1;
  let latestDone = -1;
  slots.forEach((slot, i) => {
    if (!slot.game) return;
    latest = i;
    if (slot.game.played || slot.game.gameStatus === "final") latestDone = i;
  });
  return latestDone >= 0 ? latestDone : latest;
}

/** 막대 아래 날짜 글씨를 쓸지. 30일이면 5칸마다와 마지막 칸만, 더블헤더 두 번째 칸은 비운다 */
function showsDay(slot: BarSlot, index: number, count: number, days: number): boolean {
  if (slot.part > 0) return false;
  return days < 30 || index % 5 === 0 || index === count - 1;
}

/**
 * 경기별 막대 + 고른 경기 한 줄. 왼쪽이 오래된 날이다.
 * 결장은 점선 막대, 경기가 없는 날은 빈칸, 홈런 친 경기는 막대 위에 주황 점(좋은 활약 색).
 */
export default function GameBars({ slots, role, days }: Props) {
  const [selected, setSelected] = useState(() => defaultIndex(slots));
  const pitcher = role === "PITCHER";
  const values = slots.map((slot) => (slot.game?.played ? barValue(slot.game, role) : null));
  // 막대 꼭대기 기준: 타자 4안타, 투수 2이닝(6아웃). 더 큰 값이 있으면 그 값
  const top = Math.max(pitcher ? 6 : 4, ...values.map((v) => v ?? 0));
  const gap = days >= 30 ? "gap-0.5" : days >= 14 ? "gap-1" : "gap-1.5";
  const grid = { gridTemplateColumns: `repeat(${slots.length}, minmax(0, 1fr))` } as CSSProperties;
  const gameCount = slots.filter((slot) => slot.game).length;
  const current = slots[selected]?.game ?? null;

  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-2 text-xs text-muted">
        <h3 className="font-semibold">{pitcher ? "경기별 던진 이닝" : "경기별 안타"}</h3>
        {gameCount > 1 && <span>막대를 누르면 그 경기</span>}
      </div>

      <div role="group" aria-label={pitcher ? "경기별 던진 이닝" : "경기별 안타"} className={`mt-2 grid ${gap}`} style={grid}>
        {slots.map((slot, i) => {
          const day = showsDay(slot, i, slots.length, days);
          const dayText = (
            <span aria-hidden className="block h-8 text-center leading-tight">
              {day && (
                <>
                  {/* 30일이면 칸이 좁아 두 자리 날짜가 넘친다. 줄을 바꾸지 않고 칸 가운데에 걸쳐 쓴다 */}
                  <span
                    className={`flex justify-center whitespace-nowrap text-xs font-bold ${i === selected ? "text-accent-ink" : slot.game ? "text-foreground" : "text-muted"}`}
                  >
                    {slot.day}
                  </span>
                  {days === 7 && <span className="block text-[0.6875rem] text-muted">{formatWeekday(slot.date)}</span>}
                </>
              )}
            </span>
          );

          if (!slot.game) {
            return (
              <span key={`${slot.date}-${slot.part}`} className="flex min-w-0 flex-col gap-1">
                <span aria-hidden className="block h-[4.5rem] border-b border-line" />
                {dayText}
              </span>
            );
          }

          const game = slot.game;
          const value = values[i];
          const on = i === selected;
          const homeRun = !pitcher && (game.batting?.homeRuns ?? 0) > 0;
          const height = value != null && value > 0 ? `${(value / top) * 100}%` : null;
          return (
            <button
              key={`${slot.date}-${slot.part}`}
              type="button"
              aria-pressed={on}
              aria-label={barLabel(game, role)}
              onClick={() => setSelected(i)}
              className="group flex min-w-0 cursor-pointer flex-col gap-1 rounded-md"
            >
              <span className="relative flex h-[4.5rem] w-full items-end justify-center border-b border-line">
                {!game.played ? (
                  // 결장(투수는 등판 없음)·경기 전: 점선 막대
                  <span className={`block h-3.5 w-[72%] max-w-7 rounded-t-md border-[1.5px] border-dashed ${on ? "border-foreground" : "border-muted/60"}`} />
                ) : height ? (
                  <span
                    className={`bar-rise block w-[72%] max-w-7 rounded-t-md rounded-b-sm bg-accent transition-opacity duration-150 ${on ? "opacity-100" : "opacity-35 group-hover:opacity-60 dark:opacity-55 dark:group-hover:opacity-75"}`}
                    style={{ height, "--i": i } as CSSProperties}
                  />
                ) : (
                  // 뛰었지만 안타 0(또는 아웃 0·숫자 모름): 바닥에 얇은 막대
                  <span className={`block h-1 w-[72%] max-w-7 rounded-sm ${on ? "bg-foreground/60" : "bg-muted/35"}`} />
                )}
                {homeRun && height && (
                  <span
                    aria-hidden
                    className="absolute left-1/2 size-2 -translate-x-1/2 rounded-full bg-hot"
                    style={{ bottom: `calc(${height} + 4px)` }}
                  />
                )}
              </span>
              {dayText}
            </button>
          );
        })}
      </div>

      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[0.6875rem] text-muted">
        {!pitcher && (
          <span className="inline-flex items-center gap-1">
            <span aria-hidden className="size-2 rounded-full bg-hot" />
            홈런
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <span aria-hidden className="h-2 w-2.5 rounded-[2px] border-[1.5px] border-dashed border-muted" />
          {pitcher ? "등판 없음" : "결장"}
        </span>
        <span>빈칸은 경기 없는 날</span>
      </p>

      {/* 고른 경기 한 줄. 막대를 바꾸면 화면 낭독기가 새 줄을 읽는다 */}
      <div aria-live="polite" className="mt-3 rounded-xl bg-surface-2 px-3 py-2.5">
        {current ? (
          <>
            <p className="flex items-center gap-1.5 text-[0.8125rem] text-muted">
              <span className="tabular-nums">{`${formatShortDate(current.startTimeKst)}(${formatWeekday(current.startTimeKst)})`}</span>
              <span>{`vs ${current.opponentKo}`}</span>
              {formatLineup(current) && <span>{`· ${formatLineup(current)}`}</span>}
              <ScoreText line={current} className="text-[0.9375rem] font-extrabold text-foreground" />
              <ResultPill result={current.result} className="ml-auto" />
            </p>
            <p
              className={`mt-0.5 text-[0.9375rem] leading-[1.45] text-pretty ${current.played ? "font-semibold" : "font-medium text-muted"}`}
            >
              {formatSummary(current.summary)}
            </p>
            <Highlights batting={current.batting} pitching={current.pitching} className="mt-1.5" />
          </>
        ) : (
          <p className="text-sm text-muted">이 기간에는 경기가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
