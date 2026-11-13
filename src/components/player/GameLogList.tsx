"use client"; // 접은 결장 펼치기를 기억하고 '더 보기'를 처음 누를 때 나머지를 그려야 해서 클라이언트 컴포넌트다.

import { useMemo, useState } from "react";
import type { GameLine, MinorGameLine, Role, RosterMove } from "@/lib/api";
import { formatShortDate } from "@/lib/format";
import { buildGameLog, type GameLogItem } from "@/lib/gameLog";
import { haptic } from "@/lib/app";
import ShowMore from "@/components/ShowMore";
import GameRow from "./GameRow";

/** 처음에 보여 줄 줄 수(경기 줄과 접은 결장 줄. 달 머리 줄·콜업 띠는 세지 않는다). 나머지는 '더 보기' */
const VISIBLE = 10;

const MOVE_BAND = {
  up: { mark: "▲", text: "메이저 콜업" },
  down: { mark: "▼", text: "마이너로 내려감" },
  rehab: { mark: "＋", text: "재활 경기 시작" },
} as const;

/** "9.28"(이동 기록의 미국 날짜를 그대로) */
function moveDay(date: string): string {
  return `${Number(date.slice(5, 7))}.${Number(date.slice(8, 10))}`;
}

/**
 * 선수 페이지 경기 기록 목록(최신부터). 메이저·마이너 경기를 한 목록에 섞고(마이너 줄은 '트리플A' 표시),
 * 콜업·강등은 경기 사이 띠, 달마다 머리 줄(단계별 경기 수·성적), 이어진 결장은 한 줄로 접는다(누르면 펼침).
 * 처음 10줄은 서버에서도 그리고, 나머지는 '더 보기'를 처음 누를 때 브라우저가 그린다(긴 시즌을 다 그려 보내지 않게).
 */
export default function GameLogList({
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
  const pitcher = role === "PITCHER";
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const items = useMemo(() => buildGameLog(games, minorGames, moves, role), [games, minorGames, moves, role]);

  // 처음 VISIBLE줄과 나머지로 나눈다. 달 머리 줄·띠는 다음 경기 줄과 함께 간다
  let rowsSeen = 0;
  let cut = items.length;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.kind !== "game" && it.kind !== "skip") continue;
    if (++rowsSeen > VISIBLE) {
      cut = i;
      while (cut > 0 && (items[cut - 1].kind === "month" || items[cut - 1].kind === "move")) cut--;
      break;
    }
  }
  const head = items.slice(0, cut);
  const rest = items.slice(cut);
  const restGames = rest.reduce((n, it) => n + (it.kind === "game" ? 1 : it.kind === "skip" ? it.games.length : 0), 0);

  const toggle = (key: string) => {
    haptic("select");
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderItem = (it: GameLogItem) => {
    if (it.kind === "month") {
      return (
        // 달 머리 줄은 띠 없이 글자만(경기 줄과 같은 흰 바탕), 아래 첫 경기와는 선 없이 붙인다
        <li key={it.key} className="flex items-baseline justify-between gap-3 border-b-0 px-3.5 pt-3.5 pb-0.5 text-xs">
          <span className="shrink-0 font-bold">{it.month}월</span>
          <span className="min-w-0 truncate text-muted tabular-nums">{it.summary}</span>
        </li>
      );
    }
    if (it.kind === "move") {
      // 콜업은 파란 띠(좋은 소식), 강등·재활은 회색 띠
      const band = MOVE_BAND[it.tone];
      return (
        <li
          key={it.key}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-[0.8125rem] font-bold ${it.tone === "up" ? "bg-accent-soft text-accent-ink" : "bg-surface-2 text-muted"}`}
        >
          <span aria-hidden>{band.mark}</span>
          <span className="tabular-nums">{moveDay(it.date)}</span>
          <span>{band.text}</span>
        </li>
      );
    }
    if (it.kind === "game") {
      const e = it.entry;
      return e.kind === "mlb" ? (
        <GameRow key={it.key} game={e.game} />
      ) : (
        <GameRow key={it.key} game={e.line} levelKo={e.game.levelKo} opponentId={e.game.opponentId} hideVenue={e.game.home == null} />
      );
    }
    const expanded = open.has(it.key);
    const newest = it.games[0];
    const oldest = it.games[it.games.length - 1];
    return [
      <li key={it.key}>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => toggle(it.key)}
          className="press-soft flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
        >
          <span className="text-[0.9375rem] font-bold tabular-nums">
            {formatShortDate(oldest.startTimeKst)}–{formatShortDate(newest.startTimeKst)}
          </span>
          <span className="flex items-center gap-1 text-[0.8125rem] text-muted">
            {pitcher ? "등판 없음" : "결장"} {it.games.length}경기
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`size-3.5 transition-transform duration-200 motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
            >
              <path d="m4 6 4 4 4-4" />
            </svg>
          </span>
        </button>
      </li>,
      ...(expanded ? it.games.map((g) => <GameRow key={`${it.key}-${g.gameId}`} game={g} />) : []),
    ];
  };

  return (
    <div className="card overflow-hidden">
      <ul className="divide-y divide-line">{head.map(renderItem)}</ul>
      {rest.length > 0 && (
        <ShowMore lazy moreLabel={`${restGames}경기 더 보기`} buttonClassName="border-t border-line py-2.5">
          {/* 펼쳐도 화면이 끝없이 늘지 않게 일정 높이 안에서 스크롤한다(이동 기록과 같은 방식) */}
          <ul className="max-h-[36rem] divide-y divide-line overflow-y-auto overscroll-contain border-t border-line">
            {rest.map(renderItem)}
          </ul>
        </ShowMore>
      )}
    </div>
  );
}
