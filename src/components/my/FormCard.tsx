import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import type { HitterPeriod, MyPlayer, PitcherPeriod } from "@/lib/api";
import { formatEra, formatRate } from "@/lib/format";
import { teamColor } from "@/lib/teams";
import { GameRow } from "@/components/player/GameLog";
import BandPhoto from "./BandPhoto";
import GameBars from "./GameBars";
import MyPlayerToggle from "./MyPlayerToggle";
import { barSlots } from "./columns";

interface Props {
  entry: MyPlayer;
  days: number;
  fromKst: string;
  toKst: string;
  statsAvailable: boolean;
}

/** 띠 왼쪽 위 딱지: 2경기 이상 이어질 때만 */
function streakText(entry: MyPlayer): string | null {
  if (entry.streak == null || entry.streak < 2) return null;
  return entry.player.role === "PITCHER" ? `${entry.streak}경기 연속 무실점` : `${entry.streak}경기 연속 안타`;
}

/** 내 선수 한 명의 카드: 팀 색 띠와 사진 → 이름 → 큰 숫자와 작은 숫자 셋 → 경기별 막대 → 경기별 기록 모두 보기 */
export default function FormCard({ entry, days, fromKst, toKst, statsAvailable }: Props) {
  const { player, games } = entry;
  const streak = streakText(entry);
  const meta = [player.teamKo, player.positionKo].filter(Boolean).join(" · ");
  const period = entry.hitting ?? entry.pitching;

  return (
    <li className="card flex flex-col overflow-hidden">
      <div className="player-stage h-[5.75rem]" style={{ "--team": teamColor(player.teamAbbr) } as CSSProperties}>
        {streak && (
          <span className="absolute left-3.5 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold leading-5 shadow-[var(--shadow-card)]">
            <span aria-hidden className="size-[7px] rounded-full bg-accent" />
            {streak}
          </span>
        )}
        <BandPhoto nameKo={player.nameKo} photoUrl={player.photoUrl} teamAbbr={player.teamAbbr} />
      </div>

      <div className="flex flex-1 flex-col px-4 pb-2 pt-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-extrabold leading-snug tracking-[-0.02em]">
              <Link href={`/players/${player.id}`} className="hover:text-accent-ink">
                {player.nameKo}
              </Link>
            </h2>
            {meta && <p className="text-[0.8125rem] text-muted">{meta}</p>}
          </div>
          <MyPlayerToggle playerId={player.id} nameKo={player.nameKo} initialOn variant="icon" className="-mr-2 -mt-1" />
        </div>

        {statsAvailable && period ? (
          <>
            {entry.hitting && <HitterNumbers days={days} hitting={entry.hitting} />}
            {entry.pitching && <PitcherNumbers days={days} pitching={entry.pitching} />}
            {/* 기간이 바뀌면 막대 자리도 바뀌므로 고른 막대를 처음부터 다시 정한다(key) */}
            <GameBars key={`${fromKst}~${toKst}`} slots={barSlots(fromKst, toKst, games)} role={player.role} days={days} />
          </>
        ) : (
          <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-muted">
            {statsAvailable ? "아직 이 선수의 기록을 연결하지 못했습니다." : "요금제가 없어 경기별 기록을 받지 못했습니다."}
          </p>
        )}

        {games.length > 0 && (
          <details className="group mt-auto pt-3">
            <summary className="flex cursor-pointer list-none items-center justify-center gap-1 rounded-lg py-2 text-[0.8125rem] font-semibold text-accent-ink [&::-webkit-details-marker]:hidden">
              {`경기별 기록 ${games.length}개 모두 보기`}
              <Chevron />
            </summary>
            <ul className="-mx-4 border-t border-line divide-y divide-line">
              {games.map((game) => (
                <GameRow key={game.gameId} game={game} />
              ))}
            </ul>
          </details>
        )}
      </div>
    </li>
  );
}

/** 큰 숫자 하나(왼쪽) + 회색 칸 작은 숫자 셋(오른쪽) */
function Numbers({
  label,
  value,
  note,
  small,
}: {
  label: string;
  value: string;
  note: ReactNode;
  small: [string, string | number][];
}) {
  return (
    <div className="mt-3.5 grid grid-cols-[auto_minmax(0,1fr)] items-end gap-4">
      <dl>
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="mt-1 text-[2.75rem] font-extrabold leading-none tracking-[-0.03em] tabular-nums">{value}</dd>
        <dd className="mt-1.5 text-xs font-semibold text-accent-ink">{note}</dd>
      </dl>
      <dl className="grid grid-cols-3 rounded-xl bg-surface-2 py-2 text-center">
        {small.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="text-xl font-extrabold leading-tight tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function HitterNumbers({ days, hitting }: { days: number; hitting: HitterPeriod }) {
  return (
    <Numbers
      label={`최근 ${days}일 타율`}
      value={formatRate(hitting.avg)}
      note={<RateDelta value={hitting.avg} season={hitting.seasonAvg} played={hitting.games > 0} />}
      small={[
        ["안타", hitting.hits],
        ["홈런", hitting.homeRuns],
        ["타점", hitting.rbi],
      ]}
    />
  );
}

function PitcherNumbers({ days, pitching }: { days: number; pitching: PitcherPeriod }) {
  return (
    <Numbers
      label={`최근 ${days}일 평균자책점`}
      value={formatEra(pitching.era)}
      note={pitching.games === 0 ? "이 기간 등판 없음" : `시즌 ${formatEra(pitching.seasonEra)}`}
      small={[
        ["등판", pitching.games],
        ["이닝", pitching.inningsText],
        ["탈삼진", pitching.strikeouts],
      ]}
    />
  );
}

/** "시즌 .301보다 ▲.047". 타수가 없거나 시즌 기록이 없으면 그 사실만 */
function RateDelta({ value, season, played }: { value: number | null; season: number | null; played: boolean }) {
  if (!played) return <>이 기간 출전 없음</>;
  if (value == null) return <>이 기간 타수 없음</>;
  if (season == null) return null;
  // 소수 셋째 자리에서 비교해 화면 숫자와 어긋나지 않게 한다.
  const diff = Math.round(value * 1000) - Math.round(season * 1000);
  if (diff === 0) return <>{`시즌 ${formatRate(season)} · 차이 없음`}</>;
  const up = diff > 0;
  return (
    <span className="inline-flex items-center gap-0.5">
      {`시즌 ${formatRate(season)}보다`}
      <svg aria-hidden viewBox="0 0 10 10" className={`ml-0.5 size-2.5 fill-current ${up ? "" : "rotate-180"}`}>
        <path d="M5 1.5 9 8.5H1z" />
      </svg>
      <span className="sr-only">{up ? "높음" : "낮음"}</span>
      <span className="tabular-nums">{formatRate(Math.abs(diff) / 1000)}</span>
    </span>
  );
}

function Chevron() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 transition-transform duration-200 group-open:rotate-180"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}
