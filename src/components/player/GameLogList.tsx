"use client"; // '전체/뛴 경기' 고르기와 접은 결장 펼치기를 기억해야 해서 클라이언트 컴포넌트다.

import { useMemo, useState } from "react";
import type { GameLine, RosterMove } from "@/lib/api";
import { formatShortDate } from "@/lib/format";
import { buildGameLog, type GameLogFilter, type GameLogItem } from "@/lib/gameLog";
import Segmented from "@/components/Segmented";
import ShowMore from "@/components/ShowMore";
import GameRow from "./GameRow";

/** 처음에 보여 줄 줄 수(경기 줄과 접은 결장 줄, 달 머리 줄은 세지 않는다). 나머지는 '더 보기' */
const VISIBLE = 10;

/**
 * 선수 페이지 경기 기록 목록(최신부터). 달마다 머리 줄(그달 뛴 경기·타율, 투수는 평균자책점),
 * 이어진 결장은 한 줄로 접고(누르면 펼침), '전체 / 뛴 경기'로 고른다.
 * 처음 10줄은 서버에서도 그리고, 나머지는 '더 보기'를 처음 누를 때 브라우저가 그린다(긴 시즌을 다 그려 보내지 않게).
 */
export default function GameLogList({ games, moves }: { games: GameLine[]; moves: RosterMove[] }) {
  const pitcher = games[0]?.role === "PITCHER";
  const playedCount = games.filter((g) => g.played).length;
  const [filter, setFilter] = useState<GameLogFilter>("all");
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const items = useMemo(() => buildGameLog(games, filter, moves), [games, filter, moves]);

  // 처음 VISIBLE줄과 나머지로 나눈다(달 머리 줄은 다음 줄과 함께 간다)
  let rowsSeen = 0;
  let cut = items.length;
  for (let i = 0; i < items.length; i++) {
    if (items[i].kind === "month") continue;
    rowsSeen++;
    if (rowsSeen > VISIBLE) {
      cut = items[i - 1]?.kind === "month" ? i - 1 : i;
      break;
    }
  }
  const head = items.slice(0, cut);
  const rest = items.slice(cut);
  const restGames = rest.reduce((n, it) => n + (it.kind === "game" ? 1 : it.kind === "skip" ? it.games.length : 0), 0);

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const renderItem = (it: GameLogItem) => {
    if (it.kind === "month") {
      return (
        <li key={it.key} className="flex items-baseline justify-between gap-3 bg-surface-2/70 px-3.5 py-1.5 text-xs">
          <span className="font-bold">{it.fromMonth ? `${it.fromMonth}–${it.month}월` : `${it.month}월`}</span>
          <span className="text-muted tabular-nums">{it.summary}</span>
        </li>
      );
    }
    if (it.kind === "game") return <GameRow key={it.key} game={it.game} />;
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
            {it.reason === "minors" ? "마이너에 있던 기간" : it.reason === "injured" ? "부상자 명단" : pitcher ? "등판 없음" : "결장"}{" "}
            {it.games.length}경기
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
    <div className="space-y-2.5">
      {/* 결장이 없으면 고를 것이 없어 숨긴다 */}
      {playedCount < games.length && (
        <Segmented
          label="경기 기록 보기"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `전체 ${games.length}` },
            { value: "played", label: `${pitcher ? "등판" : "뛴 경기"} ${playedCount}` },
          ]}
        />
      )}
      <div className="card overflow-hidden">
        <ul className="divide-y divide-line">{head.map(renderItem)}</ul>
        {rest.length > 0 && (
          // 고르기를 바꾸면 '더 보기'를 접힌 상태로 되돌린다
          <ShowMore key={filter} lazy moreLabel={`${restGames}경기 더 보기`} buttonClassName="border-t border-line py-2.5">
            {/* 펼쳐도 화면이 끝없이 늘지 않게 일정 높이 안에서 스크롤한다(이동 기록과 같은 방식) */}
            <ul className="max-h-[36rem] divide-y divide-line overflow-y-auto overscroll-contain border-t border-line">
              {rest.map(renderItem)}
            </ul>
          </ShowMore>
        )}
      </div>
    </div>
  );
}
