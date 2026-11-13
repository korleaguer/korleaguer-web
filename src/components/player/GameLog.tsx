import type { GameLine, RosterMove } from "@/lib/api";
import Section from "@/components/Section";
import GameLogList from "./GameLogList";
import { cacheLife } from "next/cache";

// 내 선수 카드(FormCard)가 이 경로로 가져다 쓴다
export { default as GameRow } from "./GameRow";

/**
 * 경기 기록 (최신 경기부터). 카드 한 장 안에 경기마다 한 줄: 왼쪽 날짜, 오른쪽 상대·점수·결과와 한 줄 기록.
 * 달마다 머리 줄(그달 성적), 이어진 결장은 한 줄로 접고, '전체 / 뛴 경기'로 고른다(GameLogList).
 * 시즌 전체(160경기 넘게)를 한 번에 펼치면 휴대폰에서 아래의 선수 정보·이동 기록이 한참 밀리므로
 * 처음 10줄만 먼저 보여 준다. 나머지는 서버에서 그리지 않고 데이터로만 보내, '더 보기'를 처음 누를 때 브라우저가 그린다.
 * 다 그려 보내면 선수 페이지가 590KB까지 커지고 운영 장비에서 그리는 데만 0.6초 넘게 걸렸다.
 */
export default async function GameLog({ games, moves }: { games: GameLine[]; moves: RosterMove[] }) {
  // 잠깐 재사용: 같은 데이터면 30초 동안 그려 둔 것을 다시 쓴다(쿠키와 상관없는 부품이라 모두에게 같다).
  // 운영 서버(라즈베리파이 4)는 화면 그리기가 느려서 큰 부품을 매번 그리지 않는다.
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  return (
    <Section id="games-title" title="경기 기록" aside={`${games.length}경기`}>
      {games.length === 0 ? <p className="card px-4 py-5 text-sm text-muted">경기 기록이 없어요.</p> : <GameLogList games={games} moves={moves} />}
    </Section>
  );
}
