"use client"; // 달·날짜를 누르면 달력과 아래 경기 줄을 바꿔야 해서 클라이언트 컴포넌트다.

import { useMemo, useState } from "react";
import type { GameLine, MinorGameLine, Role, RosterMove } from "@/lib/api";
import { buildGameCalendar, lineOf, monthCells, monthSummary, type CalendarDay, type DayTone } from "@/lib/gameLog";
import { haptic } from "@/lib/app";
import { moveTone } from "@/lib/moves";
import { teamColor, teamColorById, teamLogoUrl, teamLogoUrlById } from "@/lib/teams";
import TeamMark from "@/components/TeamMark";
import GameRow from "./GameRow";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 칸 색. 경기별 막대와 같은 뜻이다: 파랑 = 안타(투수는 무실점), 채운 주황 = 가장 큰 활약, 점선 = 결장.
 * 채운 칸 글자는 흰색(4.5:1 이상), 연파랑·회색 칸은 진한 글자.
 */
const TONE: Record<Exclude<DayTone, "rest">, string> = {
  hr: "bg-hot-strong text-hot-on",
  multi: "bg-accent text-accent-fg",
  hit: "bg-accent-soft text-accent-ink",
  zero: "bg-surface-2 text-muted",
  off: "border-[1.5px] border-dashed border-muted/50 text-muted",
  pending: "border border-line text-muted",
};

/** 채운 칸(흰 글자). 날짜를 조금 흐리게 하고, 넓은 칸의 팀 로고는 흰 바탕에 올린다 */
function filled(tone: DayTone): boolean {
  return tone === "hr" || tone === "multi";
}

/**
 * 휴대폰 칸의 마이너 단계 짧은 표기. 칸이 약 43px라 두 자리 날짜 옆에 'AAA'가 들어가지 않는다(점검 11-15: '20 A…'로 잘림).
 * 넓은 칸은 'AAA' 그대로 쓴다
 */
const SHORT_LEVEL: Record<string, string> = { AAA: "3A", AA: "2A", ROK: "R" };

/** 이동 기록 날짜(미국 날짜) "2026-09-21" → "9.21" */
function moveDay(date: string): string {
  return `${Number(date.slice(5, 7))}.${Number(date.slice(8, 10))}`;
}

/**
 * 선수 페이지 경기 기록: 달 칸 + 월 달력 + 고른 날 경기 줄(사용자 11-15 시안 D).
 * 칸마다 그날 결과(홈런·N안타·무안타·결장, 투수는 승리·세이브·무실점·N실점)를 쓰고, 날짜를 누르면 아래에 그날 경기 줄이 나온다.
 * 휴대폰은 칸이 좁아 짧은 말 하나, 넓은 화면(640px 이상)은 상대 로고·타수와 안타(투수는 이닝과 실점)·팀 결과까지 쓴다.
 * 처음에는 마지막 경기가 있는 달과 그달 마지막으로 뛴 날을 고른다. 그달 이동(콜업·강등·부상자 명단)은 달력 아래 한 줄로 둔다.
 */
export default function GameCalendar({
  games,
  minorGames,
  moves,
  role,
}: {
  games: GameLine[];
  minorGames: MinorGameLine[];
  moves: RosterMove[];
  role: Role;
}) {
  const calendar = useMemo(() => buildGameCalendar(games, minorGames, role), [games, minorGames, role]);
  const [monthKey, setMonthKey] = useState(calendar.defaultMonth);
  const month = calendar.months.find((m) => m.key === monthKey) ?? calendar.months.at(-1) ?? null;
  const [dayKey, setDayKey] = useState(month?.defaultDay ?? null);
  if (!month) return null;

  const pitcher = role === "PITCHER";
  const selected = dayKey ? (calendar.days.get(dayKey) ?? null) : null;
  const cells = monthCells(month.year, month.month);
  const monthMoves = moves.filter((m) => m.date.startsWith(month.key)).sort((a, b) => a.date.localeCompare(b.date));

  const pickMonth = (key: string) => {
    if (key === month.key) return;
    haptic("select");
    setMonthKey(key);
    setDayKey(calendar.months.find((m) => m.key === key)?.defaultDay ?? null);
  };
  const pickDay = (key: string) => {
    if (key === dayKey) return;
    haptic("select");
    setDayKey(key);
  };

  return (
    <div className="card overflow-hidden">
      {/* 달 칸: 기간 알약과 같은 모양(고른 달은 연파랑). 경기 없는 달은 흐리게 두고 누를 수 없다 */}
      <div
        role="group"
        aria-label="달 고르기"
        className="flex gap-1 overflow-x-auto border-b border-line p-2.5 [scrollbar-width:none] sm:p-3"
      >
        {calendar.months.map((m) => {
          const on = m.key === month.key;
          const empty = m.entries.length === 0;
          return (
            <button
              key={m.key}
              type="button"
              aria-pressed={on}
              disabled={empty}
              aria-label={empty ? `${m.month}월 경기 없음` : `${m.month}월`}
              onClick={() => pickMonth(m.key)}
              className={`min-w-10 flex-1 shrink-0 rounded-full px-1.5 py-1.5 text-label tabular-nums transition-colors ${
                on
                  ? "bg-accent-soft text-accent-ink"
                  : empty
                    ? "text-muted/40"
                    : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              {m.month}월
            </button>
          );
        })}
      </div>

      {/* 달 성적이 길면(메이저·루키·트리플A가 섞인 달) 자르지 않고 다음 줄로 내린다 */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3.5 pt-3.5 pb-2 sm:px-4">
        <h3 className="shrink-0 text-heading tabular-nums">{`${month.year}년 ${month.month}월`}</h3>
        <p className="text-caption text-muted tabular-nums">{monthSummary(month.entries, role)}</p>
      </div>

      <div aria-hidden className="grid grid-cols-7 gap-1 px-2.5 pb-1 sm:gap-1.5 sm:px-3">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-center text-micro text-muted">
            {w}
          </span>
        ))}
      </div>
      <div
        role="group"
        aria-label={`${month.year}년 ${month.month}월 경기 달력`}
        className="grid grid-cols-7 gap-1 px-2.5 pb-3 sm:gap-1.5 sm:px-3"
      >
        {cells.map((d, i) => {
          if (d == null) return <span key={`blank-${i}`} aria-hidden />;
          const key = `${month.key}-${String(d).padStart(2, "0")}`;
          const day = calendar.days.get(key);
          if (!day || !day.selectable) {
            // 경기 없는 날(투수는 등판 없는 날도): 날짜만
            return (
              <span key={key} aria-hidden className="h-13 p-1 text-micro text-muted tabular-nums sm:h-19 sm:p-2">
                {d}
              </span>
            );
          }
          return <DayCell key={key} day={day} on={key === dayKey} onPick={pickDay} />;
        })}
      </div>

      {/* 그달 이동(콜업·강등·부상자 명단 등). 알약 색은 이동 기록 칸과 같다 */}
      {monthMoves.length > 0 && (
        <ul aria-label={`${month.month}월 이동`} className="flex flex-wrap gap-x-3 gap-y-1.5 px-3.5 pb-3.5 sm:px-4">
          {monthMoves.map((m, i) => (
            <li key={`${m.date}-${m.typeCode}-${i}`} className="inline-flex items-center gap-1.5">
              <span className="text-caption text-muted tabular-nums">{moveDay(m.date)}</span>
              <span className={`rounded-full px-2 py-0.5 text-badge ${moveTone(m)}`}>{m.labelKo}</span>
            </li>
          ))}
        </ul>
      )}

      {/* 고른 날 경기 줄(경기 기록 줄 부품 그대로). 날짜를 바꾸면 화면 낭독기가 새 줄을 읽는다 */}
      <div aria-live="polite" className="border-t border-line">
        {selected ? (
          <ul className="divide-y divide-line">
            {selected.entries.map((e) =>
              e.kind === "mlb" ? (
                <GameRow key={`mlb-${e.game.gameId}`} game={e.game} />
              ) : (
                <GameRow
                  key={`minor-${e.game.gamePk}`}
                  game={e.line}
                  levelKo={e.game.levelKo}
                  opponentId={e.game.opponentId}
                  hideVenue={e.game.home == null}
                />
              ),
            )}
          </ul>
        ) : (
          <p className="px-4 py-4 text-body text-muted">{pitcher ? "이 달에는 등판이 없어요." : "이 달에는 뛴 경기가 없어요."}</p>
        )}
      </div>
    </div>
  );
}

/** 날짜 칸 하나. 휴대폰은 날짜와 짧은 말, 넓은 화면은 상대 로고·한 줄·팀 결과까지 */
function DayCell({ day, on, onPick }: { day: CalendarDay; on: boolean; onPick: (key: string) => void }) {
  const tone = day.tone as Exclude<DayTone, "rest">;
  const main = day.main;
  const line = lineOf(main);
  const level = main.kind === "minor" ? main.game.level : null;
  const logoUrl = main.kind === "mlb" ? teamLogoUrl(line.opponentAbbr) : teamLogoUrlById(main.game.opponentId);
  const color = main.kind === "mlb" ? teamColor(line.opponentAbbr) : teamColorById(main.game.opponentId);
  const dim = filled(tone) ? "opacity-80" : "text-muted";

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={day.speech}
      onClick={() => onPick(day.key)}
      className={`flex h-13 min-w-0 cursor-pointer flex-col justify-between rounded-lg p-1 text-left sm:h-19 sm:p-2 ${TONE[tone]} ${
        on ? "ring-2 ring-foreground ring-offset-1 ring-offset-surface" : ""
      }`}
    >
      {/* 위 줄: 날짜 | (휴대폰) 더블헤더 ×2 또는 마이너 단계, (넓은 화면) 단계와 상대 로고 */}
      <span aria-hidden className="flex items-center justify-between gap-0.5 text-micro leading-none tabular-nums">
        <span className={dim}>{day.day}</span>
        <span className={`font-bold whitespace-nowrap sm:hidden ${dim}`}>
          {day.count > 1 ? `×${day.count}` : level && (SHORT_LEVEL[level] ?? level)}
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          {level && <span className={`font-bold ${dim}`}>{level}</span>}
          <span className={filled(tone) ? "rounded-md bg-white" : ""}>
            <TeamMark logoUrl={logoUrl} color={color} size="sm" />
          </span>
        </span>
      </span>
      {/* 휴대폰: 짧은 말 하나 */}
      <span aria-hidden className="self-center whitespace-nowrap text-caption font-bold tracking-tight sm:hidden">
        {day.label}
      </span>
      {/* 넓은 화면: 한 줄 + 팀 결과 */}
      <span aria-hidden className="hidden min-w-0 sm:block">
        <span className="block truncate text-caption font-bold tracking-tight">{day.detail}</span>
        <span className={`block truncate text-micro tabular-nums ${dim}`}>{day.result || " "}</span>
      </span>
    </button>
  );
}
