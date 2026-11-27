import Link from "next/link";
import type { GameBuzz, MyPlayer } from "@/lib/api";
import Celebrate from "@/components/Celebrate";

export interface FloorBuzzItem {
  buzz: GameBuzz;
  nameKo: string;
}

/**
 * 시즌 중 홈 층 화면 맨 위의 화제 카드(11-21 사용자 결정 B안): 그날 화제 문구를 모은 흰 카드 한 장.
 * 줄마다 주황 점 + 이름(굵게) + 문구이고, 사진 원은 두지 않는다(팀 색 원과 주황 점이 붙지 않게). 층 줄은 바뀌지 않는다.
 * 줄 고르는 규칙은 아래 pickFloorBuzz. 첫 줄(가장 큰 것) 하나만 처음 보일 때 한 번 작게 커졌다 돌아온다.
 * 경기 카드(RecentGames)와 같은 경기 키(선수 id-경기 id)를 써서 두 곳에서 겹쳐 돌지 않는다.
 */
export default function FloorBuzz({ items }: { items: FloorBuzzItem[] }) {
  return (
    <ul aria-label="화제" className="card mb-3 divide-y divide-line">
      {items.map(({ buzz, nameKo }, index) => {
        const line = (
          <span className="flex items-start gap-1.5">
            {/* 줄이 바뀌어도 점은 첫 줄 가운데에 머문다 */}
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-hot" />
            <span className="min-w-0 text-pretty">
              <span className="font-bold text-foreground">{nameKo}</span> <span className="text-hot-ink">{buzz.text}</span>
            </span>
          </span>
        );
        return (
          <li key={`${buzz.playerId}-${buzz.gameId}`}>
            <Link
              href={`/players/${buzz.playerId}`}
              className="press-soft flex min-h-11 items-start px-3.5 py-2.5 text-summary"
            >
              {index === 0 ? (
                <Celebrate
                  id={`${buzz.playerId}-${buzz.gameId}`}
                  order={0}
                  scale={1.05}
                  origin="left center"
                  className="block min-w-0"
                >
                  {line}
                </Celebrate>
              ) : (
                line
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** 화제 카드에 두는 줄 수. 많으면 첫 화면이 길어져 우선순위 위에서부터 이만큼만 둔다 */
const FLOOR_BUZZ_MAX = 3;
/** 화제로 치는 시간: 경기가 시작한 지 이만큼 안이다('최근 24시간' 경기 카드와 같은 기준) */
const FLOOR_BUZZ_WINDOW_MS = 24 * 60 * 60 * 1000;
/** 서버 우선순위: 넘은 기록 > 데뷔·시즌 첫 > 연속 기록 > 시즌 최고 경기 */
const BUZZ_RANK: Record<GameBuzz["kind"], number> = { PASSED: 0, FIRST: 1, STREAK: 2, SEASON_BEST: 3 };

/**
 * 층 화면 맨 위 화제 카드에 둘 줄(11-21 B안). 선수마다 최근 24시간 안에 시작한 경기 중 서버가 문구를 준 가장 최근 경기 하나만
 * 줄이 된다(선수당 한 줄). 순서는 내 선수 먼저, 그다음 우선순위, 같으면 명단 순이고 세 줄까지다.
 * 옛 api(buzz 칸 없음)·화제 없는 날은 빈 목록이라 카드가 없다.
 */
export function pickFloorBuzz(
  players: MyPlayer[],
  buzz: GameBuzz[],
  mine: readonly number[],
  generatedAt: string,
): FloorBuzzItem[] {
  const now = Date.parse(generatedAt);
  if (Number.isNaN(now) || buzz.length === 0) return [];
  const rows: { item: FloorBuzzItem; mine: boolean; rank: number; order: number }[] = [];
  players.forEach((entry, order) => {
    // 최신 경기부터 보며 24시간 안에 뛴 경기 중 문구가 있는 첫 경기를 쓴다(마이너 경기 줄이 맨 앞에 와도 메이저 화제를 놓치지 않는다)
    for (const game of entry.games) {
      if (!game.played) continue;
      const started = Date.parse(game.startTimeKst);
      if (Number.isNaN(started) || started > now || now - started > FLOOR_BUZZ_WINDOW_MS) continue;
      const found = buzz.find((b) => b.playerId === entry.player.id && b.gameId === game.gameId);
      if (!found) continue;
      rows.push({
        item: { buzz: found, nameKo: entry.player.nameKo },
        mine: mine.includes(entry.player.id),
        rank: BUZZ_RANK[found.kind] ?? 9,
        order,
      });
      return;
    }
  });
  rows.sort((a, b) => Number(b.mine) - Number(a.mine) || a.rank - b.rank || a.order - b.order);
  return rows.slice(0, FLOOR_BUZZ_MAX).map((r) => r.item);
}
