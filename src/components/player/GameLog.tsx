import type { GameLine } from "@/lib/api";
import Section from "@/components/Section";
import GameRow from "./GameRow";
import MoreGames from "./MoreGames";
import { cacheLife } from "next/cache";

// 내 선수 카드(FormCard)가 이 경로로 가져다 쓴다
export { default as GameRow } from "./GameRow";

/** 처음에 보여 줄 경기 수(최근부터). 나머지는 '더 보기'로 펼친다 */
const VISIBLE = 10;

/**
 * 경기 기록 (최신 경기부터). 카드 한 장 안에 경기마다 한 줄: 왼쪽 날짜, 오른쪽 상대·점수·결과와 한 줄 기록.
 * 시즌 전체(160경기 넘게)를 한 번에 펼치면 휴대폰에서 아래의 선수 정보·이동 기록이 한참 밀리므로
 * 최근 10경기만 먼저 보여 준다. 나머지는 서버에서 그리지 않고 데이터로만 보내, '더 보기'를 처음 누를 때 브라우저가 그린다
 * (MoreGames). 다 그려 보내면 선수 페이지가 590KB까지 커지고 운영 장비에서 그리는 데만 0.6초 넘게 걸렸다.
 */
export default async function GameLog({ games }: { games: GameLine[] }) {
  // 잠깐 재사용: 같은 데이터면 30초 동안 그려 둔 것을 다시 쓴다(쿠키와 상관없는 부품이라 모두에게 같다).
  // 운영 서버(라즈베리파이 4)는 화면 그리기가 느려서 큰 부품을 매번 그리지 않는다.
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  const shown = games.slice(0, VISIBLE);
  const rest = games.slice(VISIBLE);

  return (
    <Section id="games-title" title="경기 기록" aside={`${games.length}경기`}>
      {games.length === 0 ? (
        <p className="card px-4 py-5 text-sm text-muted">경기 기록이 없어요.</p>
      ) : (
        <div className="card">
          <ul className="divide-y divide-line">
            {shown.map((g) => (
              <GameRow key={g.gameId} game={g} />
            ))}
          </ul>
          {/* 펼치면 나머지 경기가 버튼 위에 붙고, 버튼은 맨 아래에서 '접기'가 된다 */}
          {rest.length > 0 && <MoreGames games={rest} />}
        </div>
      )}
    </Section>
  );
}
