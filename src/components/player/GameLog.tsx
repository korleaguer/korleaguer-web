import type { GameLine, MinorGameLine, RosterMove } from "@/lib/api";
import Section from "@/components/Section";
import GameLogList from "./GameLogList";
import { cacheLife } from "next/cache";

// 내 선수 카드(FormCard)가 이 경로로 가져다 쓴다
export { default as GameRow } from "./GameRow";

/**
 * 경기 기록(최신 경기부터). 메이저·마이너 경기를 한 목록에 섞고, 콜업·강등 띠·달 머리 줄·접은 결장을 둔다(GameLogList).
 * 마이너 경기를 빼지 않는 까닭: 오래 마이너에 있는 선수는 그 경기가 유일한 소식이고, 마이너에서 잘해야 콜업된다(사용자 11-13).
 * 시즌 전체를 한 번에 펼치면 휴대폰에서 아래 칸이 한참 밀리므로 처음 10줄만 서버에서 그리고, 나머지는 '더 보기'를 처음 누를 때 그린다.
 * 다 그려 보내면 선수 페이지가 590KB까지 커지고 운영 장비에서 그리는 데만 0.6초 넘게 걸렸다.
 */
export default async function GameLog({
  games,
  minorGames,
  moves,
}: {
  games: GameLine[];
  minorGames: MinorGameLine[];
  moves: RosterMove[];
}) {
  // 잠깐 재사용: 같은 데이터면 30초 동안 그려 둔 것을 다시 쓴다(쿠키와 상관없는 부품이라 모두에게 같다).
  // 운영 서버(라즈베리파이 4)는 화면 그리기가 느려서 큰 부품을 매번 그리지 않는다.
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  return (
    // 옆에 줄 수를 적지 않는다. 줄에는 결장·포스트시즌이 섞여 있어 위 시즌 성적의 '경기'와 어긋난다(점검 11-13: '경기 43' 옆 '162경기')
    <Section id="games-title" title="경기 기록">
      {games.length === 0 && minorGames.length === 0 ? (
        <p className="card px-4 py-5 text-sm text-muted">경기 기록이 없어요.</p>
      ) : (
        <GameLogList games={games} minorGames={minorGames} moves={moves} />
      )}
    </Section>
  );
}
