// 홈 층 맨 위 오늘 맞대결 카드: 같은 경기에서 뛴 두 선수와 점수, 올해 같은 경기 줄(홈 층 SeasonFloors가 그린다).
import Link from "next/link";
import type { GameLine, SamePair } from "@/lib/api";
import { getSameGames } from "@/lib/api";
import { formatSummary, formatTime } from "@/lib/format";
import { teamColor, teamLogoUrl } from "@/lib/teams";
import PlayerAvatar from "@/components/PlayerAvatar";
import TeamMark from "@/components/TeamMark";
import Words from "@/components/Words";
import { SameGamesLine, sameGamesStateKey } from "@/components/SameGamesSheet";

/** 맞대결 점수 낭독: '샌디에이고 3, 다저스 2'(화면처럼 원정 먼저). 점수를 모르면 '샌디에이고 대 다저스' */
function derbyScoreLabel(away: GameLine, home: GameLine): string {
  if (away.teamScore == null || home.teamScore == null) return `${away.teamKo} 대 ${home.teamKo}`;
  return `${away.teamKo} ${away.teamScore}, ${home.teamKo} ${home.teamScore}`;
}

/** 맞대결 두 선수의 이번 시즌 같은 경기 묶음: 화면 왼쪽(원정) 선수 기준 */
interface DerbySeries {
  /** 왼쪽(원정) 선수 이름. 전적은 이 선수 팀 것이다 */
  nameKo: string;
  pair: SamePair;
  /** 오늘 경기가 올해 몇 번째 같은 경기인지 */
  nth: number;
}

/**
 * 오늘 맞대결 두 선수가 올해 같은 경기에 나온 묶음(GET /api/players/{id}/same-games). 카드 맨 아래 '올해 n번째 · 팀 전적 ›' 줄과
 * 그 줄이 여는 창에 쓴다. 못 받았거나(옛 api) 묶음에 오늘 경기가 없으면 null이라 줄이 없다.
 */
export async function findDerbySeries([a, b]: [GameLine, GameLine]): Promise<DerbySeries | null> {
  const [home, away] = a.home ? [a, b] : [b, a];
  const same = await getSameGames(away.playerId);
  if (!same.ok) return null;
  const pair = same.data.pairs.find((p) => p.other.playerId === home.playerId);
  const index = pair?.meetings.findIndex((m) => m.mine.gameId === away.gameId) ?? -1;
  return pair && index >= 0 ? { nameKo: away.nameKo, pair, nth: index + 1 } : null;
}

/**
 * 맞대결 카드: 같은 경기에서 뛴 두 선수와 점수. 올해 같은 경기 묶음을 받았으면 맨 아래 '올해 6번째 · 샌프란시스코 4승 2패 ›' 한 줄을
 * 두고, 누르면 그 짝의 경기 목록 창(선수 페이지 '같은 경기에 나온 선수'와 같은 창)을 연다(사용자 11-22 시안 2A, 이슈 #420)
 */
export default function DerbyCard({ pair: [a, b], series }: { pair: [GameLine, GameLine]; series: DerbySeries | null }) {
  const [home, away] = a.home ? [a, b] : [b, a];
  return (
    <div className="card mb-3 overflow-hidden">
      <div className="p-3.5">
        <div className="flex items-baseline justify-between">
          {/* 빨강은 위기(부상·DFA) 뜻이라 쓰지 않고 본문 글자를 한 단계 굵게(700) 둔다('오늘 새 기사'처럼, 전수조사 L306) */}
          <span className="text-label font-bold">오늘 맞대결</span>
          <span className="text-caption text-muted tabular-nums">{formatTime(a.startTimeKst)} 시작</span>
        </div>
        {/* 문서 순서도 화면과 같은 원정 선수 → 점수 → 홈 선수다. 예전에는 grid order로 점수만 가운데로 옮겨서, 화면 낭독기가
            두 선수를 다 읽은 뒤 팀 이름 없는 '3 : 2'를 읽었다(전수조사 L303) */}
        <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <DerbyPlayer line={away} />
          <div className="text-center">
            <span aria-hidden className="flex items-center justify-center gap-1.5">
              <TeamMark logoUrl={teamLogoUrl(away.teamAbbr)} color={teamColor(away.teamAbbr)} size="sm" />
              <span className="text-score tabular-nums">
                {away.teamScore ?? "-"} : {home.teamScore ?? "-"}
              </span>
              <TeamMark logoUrl={teamLogoUrl(home.teamAbbr)} color={teamColor(home.teamAbbr)} size="sm" />
            </span>
            {/* 로고는 그림이라 낭독에는 팀 이름을 붙인다 */}
            <span className="sr-only">{derbyScoreLabel(away, home)}</span>
          </div>
          <DerbyPlayer line={home} />
        </div>
      </div>
      {series && (
        <div className="border-t border-line">
          <SameGamesLine stateKey={sameGamesStateKey(series.pair.other.playerId)} nameKo={series.nameKo} pair={series.pair} lead={`올해 ${series.nth}번째`} />
        </div>
      )}
    </div>
  );
}

function DerbyPlayer({ line }: { line: GameLine }) {
  return (
    <Link
      href={`/players/${line.playerId}`}
      className="press-soft flex min-w-0 flex-col items-center gap-1 text-center"
    >
      <PlayerAvatar nameKo={line.nameKo} photoUrl={line.photoUrl} teamAbbr={line.teamAbbr} photoTeamAbbr={line.photoTeamAbbr} size={44} />
      <span className="text-heading">{line.nameKo}</span>
      <span className="text-caption text-muted">
        <Words text={formatSummary(line.summary)} />
      </span>
    </Link>
  );
}
