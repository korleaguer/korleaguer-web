import Link from "next/link";
import type { GameBuzz } from "@/lib/api";
import Celebrate from "@/components/Celebrate";

export interface FloorBuzzItem {
  buzz: GameBuzz;
  nameKo: string;
}

/**
 * 시즌 중 홈 층 화면 맨 위의 화제 카드(11-21 사용자 결정 B안): 그날 화제 문구를 모은 흰 카드 한 장.
 * 줄마다 주황 점 + 이름(굵게) + 문구이고, 사진 원은 두지 않는다(팀 색 원과 주황 점이 붙지 않게). 층 줄은 바뀌지 않는다.
 * 줄 고르는 규칙은 pickFloorBuzz. 첫 줄(가장 큰 것) 하나만 처음 보일 때 한 번 작게 커졌다 돌아온다.
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
