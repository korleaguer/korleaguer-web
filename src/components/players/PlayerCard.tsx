import Link from "next/link";
import type { HitterSeason, PitcherSeason, PlayerSummary } from "@/lib/api";
import { formatAge, formatEra, formatRate } from "@/lib/format";
import PlayerAvatar from "@/components/PlayerAvatar";
import TeamName from "@/components/TeamName";

interface Props {
  player: PlayerSummary;
  /** 이 선수의 시즌 기록. 없으면 null (타자는 hitting, 투수는 pitching만 본다) */
  hitting: HitterSeason | null;
  pitching: PitcherSeason | null;
}

interface Stat {
  label: string;
  value: string;
}

/** 카드 아래 기록 세 칸. 타자끼리, 투수끼리 같은 칸이 같은 자리에 와서 나란히 비교할 수 있다. 기록이 없으면 null */
function seasonStats(player: PlayerSummary, hitting: HitterSeason | null, pitching: PitcherSeason | null): Stat[] | null {
  if (player.role === "PITCHER") {
    return pitching
      ? [
          { label: "평균자책점", value: formatEra(pitching.era) },
          { label: "승-패", value: `${pitching.wins}-${pitching.losses}` },
          { label: "탈삼진", value: String(pitching.strikeouts) },
        ]
      : null;
  }
  return hitting
    ? [
        { label: "타율", value: formatRate(hitting.avg) },
        { label: "홈런", value: String(hitting.homeRuns) },
        { label: "OPS", value: formatRate(hitting.ops) },
      ]
    : null;
}

/** 선수 목록의 카드 한 장(여권 신원 면을 줄인 모양). 카드 어디를 눌러도 선수 페이지로 간다. */
export default function PlayerCard({ player, hitting, pitching }: Props) {
  // "중견수 · 만 28세 · #51". 없는 건 뺀다.
  const info = [player.positionKo, formatAge(player.age), player.jersey && `#${player.jersey}`]
    .filter(Boolean)
    .join(" · ");
  const stats = seasonStats(player, hitting, pitching);

  return (
    // 이름 링크를 카드 전체로 넓혀서(after:absolute) 카드 전체가 링크가 된다. 화면 낭독기는 이름만 읽는다.
    <li className="relative flex flex-col rounded-[10px] bg-surface p-4 hover:bg-surface-2 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-accent">
      <div className="flex gap-3.5">
        <PlayerAvatar
          size="md"
          nameKo={player.nameKo}
          photoUrl={player.photoUrl}
          teamAbbr={player.teamAbbr}
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/players/${player.id}`}
            className="text-lg font-bold leading-tight after:absolute after:inset-0 focus-visible:outline-none"
          >
            {player.nameKo}
          </Link>
          {player.nameEn && (
            <p className="mt-0.5 truncate text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted">
              {player.nameEn}
            </p>
          )}
          {player.teamKo && (
            <p className="mt-2 text-sm">
              <TeamName teamKo={player.teamKo} teamAbbr={player.teamAbbr} />
            </p>
          )}
          {info && <p className="mt-0.5 text-xs text-muted">{info}</p>}
        </div>
      </div>
      {/* mt-auto: 같은 줄의 카드끼리 기록 칸이 같은 높이에 오도록 카드 아래 끝에 붙인다 */}
      <div className="mt-auto pt-4">
        {stats ? (
          <dl className="grid grid-cols-3 border-t border-line pt-3">
            {stats.map(({ label, value }) => (
              <div key={label} className="min-w-0">
                <dt className="text-[0.6875rem] text-muted">{label}</dt>
                <dd className="mt-0.5 text-xl font-bold tracking-tight tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="border-t border-line pt-3 text-sm text-muted">시즌 기록 없음</p>
        )}
      </div>
    </li>
  );
}
