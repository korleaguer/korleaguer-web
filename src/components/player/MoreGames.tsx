"use client"; // '더 보기'를 처음 누를 때 나머지 경기를 브라우저에서 그린다.

import type { GameLine } from "@/lib/api";
import ShowMore from "@/components/ShowMore";
import GameRow from "./GameRow";

/**
 * 경기 기록에서 처음 10경기 뒤의 나머지. 서버는 경기 데이터만 보내고, 줄은 '더 보기'를 처음 누를 때 그린다(ShowMore lazy).
 * 한 번 펼친 뒤로는 접어도 그려 둔다(다시 펼칠 때 스크롤 위치가 남는다).
 */
export default function MoreGames({ games }: { games: GameLine[] }) {
  return (
    <ShowMore lazy moreLabel={`${games.length}경기 더 보기`} buttonClassName="border-t border-line py-2.5">
      {/* 펼쳐도 화면이 끝없이 늘지 않게 일정 높이 안에서 스크롤한다(이동 기록과 같은 방식) */}
      <ul className="max-h-[36rem] divide-y divide-line overflow-y-auto overscroll-contain border-t border-line">
        {games.map((g) => (
          <GameRow key={g.gameId} game={g} />
        ))}
      </ul>
    </ShowMore>
  );
}
