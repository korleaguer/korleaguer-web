import Link from "next/link";
import type { HitterSeason, PitcherSeason, PlayerSummary } from "@/lib/api";
import { mainSeasonStats } from "@/lib/seasonStats";
import InfoChips from "@/components/InfoChips";
import PlayerSubline from "@/components/PlayerSubline";
import PlayerAvatar from "@/components/PlayerAvatar";
import MyPlayerToggle from "@/components/my/MyPlayerToggle";

interface Props {
  player: PlayerSummary;
  /** 이 선수의 메이저 시즌 기록. 없으면 null (타자는 hitting, 투수는 pitching만 본다) */
  hitting: HitterSeason | null;
  pitching: PitcherSeason | null;
  /** 같은 시즌 마이너 기록. 없으면 null */
  minorHitting: HitterSeason | null;
  minorPitching: PitcherSeason | null;
  /** 내 선수로 골라 둔 선수인지 */
  isMine: boolean;
}

/** 선수 목록의 카드 한 장. 카드 어디를 눌러도 선수 페이지로 가고, 오른쪽 위 별은 '내 선수' 넣기·빼기다. */
export default function PlayerCard({ player, hitting, pitching, minorHitting, minorPitching, isMine }: Props) {
  // 올해 주로 뛴 단계의 기록. 메이저 4타석 .500 같은 작은 표본이 시즌 기록처럼 서지 않게 단계·경기 수를 함께 적는다(이슈 #184)
  const main = mainSeasonStats(player, { hitting, pitching, minorHitting, minorPitching });

  return (
    // 이름 링크를 카드 전체로 넓혀서(after:absolute) 카드 전체가 링크가 된다. 화면 낭독기는 이름만 읽는다.
    <li className="card card-link relative flex flex-col p-4 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent">
      <div className="flex items-center gap-3">
        <PlayerAvatar size={56} nameKo={player.nameKo} photoUrl={player.photoUrl} teamAbbr={player.teamAbbr} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/players/${player.id}`}
            className="text-heading after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
          >
            {player.nameKo}
          </Link>
          <PlayerSubline player={player} />
        </div>
        {/* 카드 전체 링크(after) 위에 올려야 눌린다 */}
        <MyPlayerToggle
          playerId={player.id}
          nameKo={player.nameKo}
          initialOn={isMine}
          variant="icon"
          className="relative z-10 -mr-2 self-start"
        />
      </div>
      <InfoChips player={player} className="mt-3" />
      {/* mt-auto: 같은 줄의 카드끼리 기록 칸이 같은 높이에 오도록 카드 아래 끝에 붙인다 */}
      <div className="mt-auto pt-3.5">
        {main ? (
          <div className="border-t border-line pt-3">
            <p className="mb-1.5 text-label text-muted">{main.label}</p>
            <dl className="grid grid-cols-3">
              {main.stats.map(({ label, value }) => (
                <div key={label} className="min-w-0">
                  <dt className="text-caption text-muted">{label}</dt>
                  <dd className="mt-0.5 text-stat tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <p className="border-t border-line pt-3 text-body text-muted">시즌 기록 없음</p>
        )}
      </div>
    </li>
  );
}
