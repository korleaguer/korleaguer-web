import type { GameLine, MinorGameLine, Role, RosterMove } from "@/lib/api";
import Section from "@/components/Section";
import GameCalendar from "./GameCalendar";
import { cacheLife } from "next/cache";

/**
 * 경기 기록: 달 칸 + 월 달력 + 고른 날 경기 줄(GameCalendar, 사용자 11-15 시안 D).
 * 예전에는 최신 경기부터 한 줄씩 쌓고 '더 보기'를 누르면 안쪽 상자에서 스크롤했는데, 시즌 초 경기를 보려면
 * 그 상자 안에서 1만 px 넘게 내려가야 했다(이정후 2026: 3월이 약 11,800px 아래). 달력은 어느 달이든 달 칸 한 번이면 된다.
 * 마이너 경기를 빼지 않는 까닭: 오래 마이너에 있는 선수는 그 경기가 유일한 소식이고, 마이너에서 잘해야 콜업된다(사용자 11-13).
 */
export default async function GameLog({
  playerId,
  games,
  minorGames,
  moves,
  role,
}: {
  playerId: number;
  games: GameLine[];
  minorGames: MinorGameLine[];
  moves: RosterMove[];
  role: Role;
}) {
  // 잠깐 재사용: 같은 데이터면 30초 동안 그려 둔 것을 다시 쓴다(쿠키와 상관없는 부품이라 모두에게 같다).
  // 운영 서버(라즈베리파이 4)는 화면 그리기가 느려서 큰 부품을 매번 그리지 않는다.
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  return (
    // 옆에 줄 수를 적지 않는다. 줄에는 결장·포스트시즌이 섞여 있어 위 시즌 성적의 '경기'와 어긋난다(점검 11-13: '경기 43' 옆 '162경기')
    <Section id="games-title" title="경기 기록">
      {games.length === 0 && minorGames.length === 0 ? (
        <p className="card px-4 py-5 text-body text-muted">경기 기록이 없어요.</p>
      ) : (
        <GameCalendar playerId={playerId} games={games} minorGames={minorGames} moves={moves} role={role} />
      )}
    </Section>
  );
}
