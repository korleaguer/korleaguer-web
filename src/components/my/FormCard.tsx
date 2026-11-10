import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import type { HitterPeriod, MyPlayer, PitcherPeriod } from "@/lib/api";
import { formatDateRange, formatEra, formatRate } from "@/lib/format";
import { teamColor } from "@/lib/teams";
import { GameRow } from "@/components/player/GameLog";
import LevelChip from "@/components/LevelChip";
import BandPhoto from "./BandPhoto";
import GameBars from "./GameBars";
import MyPlayerToggle from "./MyPlayerToggle";
import { barSlots } from "./columns";

interface Props {
  entry: MyPlayer;
  days: number;
  statsAvailable: boolean;
}

/** 띠 왼쪽 위 딱지: 2경기 이상 이어질 때만 */
function streakText(entry: MyPlayer): string | null {
  if (entry.streak == null || entry.streak < 2) return null;
  return entry.player.role === "PITCHER" ? `${entry.streak}경기 연속 무실점` : `${entry.streak}경기 연속 안타`;
}

/** 내 선수 한 명의 카드: 팀 색 띠와 사진 → 이름 → 큰 숫자와 작은 숫자 셋 → 경기별 막대 → 경기별 기록 모두 보기 */
export default function FormCard({ entry, days, statsAvailable }: Props) {
  const { player, games, fromKst, toKst, isFallback } = entry;
  const streak = streakText(entry);
  const meta = [player.teamKo, player.positionKo].filter(Boolean).join(" · ");
  const period = entry.hitting ?? entry.pitching;

  return (
    <li className="card flex flex-col overflow-hidden">
      <div className="player-stage h-[5.75rem]" style={{ "--team": teamColor(player.teamAbbr) } as CSSProperties}>
        {streak && (
          <span className="absolute left-3.5 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold leading-5 shadow-[var(--shadow-card)]">
            <span aria-hidden className="size-[7px] rounded-full bg-hot" />
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
            {/* 최근 기간에 경기가 없어 이 선수가 마지막으로 뛴 날까지로 당긴 카드: 어느 기간인지 적는다 */}
            {isFallback && (
              <p className="mt-0.5 text-xs text-muted">{`마지막으로 뛴 ${days}일 · ${formatDateRange(fromKst, toKst)}`}</p>
            )}
            {/* 마이너에 있거나 FA면 이름 아래에 바로 알린다. 메이저는 기본이라 카드에서는 따로 쓰지 않는다 */}
            {(player.level === "MINORS" || player.freeAgent) && (
              <LevelChip player={player} className="mt-1.5 max-w-full" />
            )}
          </div>
          <MyPlayerToggle playerId={player.id} nameKo={player.nameKo} initialOn variant="icon" className="-mr-2 -mt-1" />
        </div>

        {statsAvailable && period ? (
          <>
            {entry.hitting && <HitterNumbers period={periodLabel(days, isFallback)} hitting={entry.hitting} />}
            {entry.pitching && <PitcherNumbers period={periodLabel(days, isFallback)} pitching={entry.pitching} />}
            {/* 기간이 바뀌면 막대 자리도 바뀌므로 고른 막대를 처음부터 다시 정한다(key) */}
            <GameBars key={`${fromKst}~${toKst}`} slots={barSlots(fromKst, toKst, games)} role={player.role} days={days} />
          </>
        ) : (
          <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-muted">
            {statsAvailable ? "아직 이 선수의 기록을 연결하지 못했습니다." : "아직 경기별 기록을 받지 못했습니다."}
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
        <dd className="mt-1.5 text-xs font-semibold text-muted">{note}</dd>
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

/** 큰 숫자 이름 앞부분: "최근 7일", 당긴 카드는 "마지막 7일" */
function periodLabel(days: number, isFallback: boolean): string {
  return `${isFallback ? "마지막" : "최근"} ${days}일`;
}

function HitterNumbers({ period, hitting }: { period: string; hitting: HitterPeriod }) {
  return (
    <Numbers
      label={`${period} 타율`}
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

function PitcherNumbers({ period, pitching }: { period: string; pitching: PitcherPeriod }) {
  return (
    <Numbers
      label={`${period} 평균자책점`}
      value={formatEra(pitching.era)}
      note={<EraDelta value={pitching.era} season={pitching.seasonEra} played={pitching.games > 0} />}
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
  // 소수 셋째 자리에서 비교해 화면 숫자와 어긋나지 않게 한다. 타율은 높을수록 좋다
  const diff = Math.round(value * 1000) - Math.round(season * 1000);
  return <Delta seasonText={formatRate(season)} diff={diff} better={diff > 0} amount={formatRate(Math.abs(diff) / 1000)} />;
}

/** "시즌 3.12보다 ▼0.85". 평균자책점은 낮을수록 좋다. 등판이 없거나 시즌 기록이 없으면 그 사실만 */
function EraDelta({ value, season, played }: { value: number | null; season: number | null; played: boolean }) {
  if (!played) return <>이 기간 등판 없음</>;
  if (season == null) return null;
  if (value == null) return <>{`시즌 ${formatEra(season)}`}</>;
  // 소수 둘째 자리(화면 숫자)에서 비교한다
  const diff = Math.round(value * 100) - Math.round(season * 100);
  return <Delta seasonText={formatEra(season)} diff={diff} better={diff < 0} amount={(Math.abs(diff) / 100).toFixed(2)} />;
}

/**
 * 시즌과 비교한 차이. 화살표는 숫자가 오른 쪽(▲)·내린 쪽(▼), 색은 좋아짐(불꽃 주황)·나빠짐(진한 파랑).
 * 한국 중계·증권 화면처럼 오름 빨강 계열, 내림 파랑 계열로 읽힌다(타율 기준). 화면 낭독기는 "좋아짐/나빠짐"도 읽는다.
 */
function Delta({ seasonText, diff, better, amount }: { seasonText: string; diff: number; better: boolean; amount: string }) {
  if (diff === 0) return <>{`시즌 ${seasonText} · 차이 없음`}</>;
  const up = diff > 0;
  return (
    <span className="inline-flex items-center gap-0.5">
      {`시즌 ${seasonText}보다`}
      <span className={`ml-0.5 inline-flex items-center gap-0.5 ${better ? "text-hot-ink" : "text-accent-ink"}`}>
        <svg aria-hidden viewBox="0 0 10 10" className={`size-2.5 fill-current ${up ? "" : "rotate-180"}`}>
          <path d="M5 1.5 9 8.5H1z" />
        </svg>
        <span className="sr-only">{`${up ? "높음" : "낮음"}, ${better ? "좋아짐" : "나빠짐"}`}</span>
        <span className="tabular-nums">{amount}</span>
      </span>
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
