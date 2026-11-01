import Link from "next/link";
import type { HitterSeason, PitcherSeason, PlayerSummary } from "@/lib/api";
import { formatAge, formatHitterLine, formatPitcherLine } from "@/lib/format";
import PlayerAvatar from "@/components/PlayerAvatar";
import TeamName from "@/components/TeamName";

interface Props {
  player: PlayerSummary;
  /** 이 선수의 시즌 기록. 없으면 null (타자는 hitting, 투수는 pitching만 본다) */
  hitting: HitterSeason | null;
  pitching: PitcherSeason | null;
}

/** 선수 목록의 카드 한 장. 카드 어디를 눌러도 선수 페이지로 간다. */
export default function PlayerCard({ player, hitting, pitching }: Props) {
  // "중견수 · 만 28세 · #51". 없는 건 뺀다.
  const info = [player.positionKo, formatAge(player.age), player.jersey && `#${player.jersey}`]
    .filter(Boolean)
    .join(" · ");
  const record =
    (player.role === "PITCHER"
      ? pitching && formatPitcherLine(pitching)
      : hitting && formatHitterLine(hitting)) ?? "시즌 기록 없음";

  return (
    // 이름 링크를 카드 전체로 넓혀서(after:absolute) 카드 전체가 링크가 된다. 화면 낭독기는 이름만 읽는다.
    <li className="relative flex gap-3 rounded-xl border border-line bg-surface p-3 hover:bg-surface-2 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-accent">
      <PlayerAvatar
        size="md"
        nameKo={player.nameKo}
        photoUrl={player.photoUrl}
        teamAbbr={player.teamAbbr}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <Link
            href={`/players/${player.id}`}
            className="text-base font-bold after:absolute after:inset-0 focus-visible:outline-none"
          >
            {player.nameKo}
          </Link>
          {player.nameEn && <span className="text-xs text-muted">{player.nameEn}</span>}
        </p>
        {player.teamKo && (
          <p className="text-sm">
            <TeamName teamKo={player.teamKo} teamAbbr={player.teamAbbr} />
          </p>
        )}
        {info && <p className="text-xs text-muted">{info}</p>}
        <p className={`text-sm tabular-nums ${hitting || pitching ? "" : "text-muted"}`}>{record}</p>
      </div>
    </li>
  );
}
