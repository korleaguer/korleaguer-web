import type { CSSProperties } from "react";
import Link from "next/link";
import type { HitterPeriod, MyPlayer, PitcherPeriod } from "@/lib/api";
import { formatEra, formatRate } from "@/lib/format";
import { teamColor } from "@/lib/teams";
import { GameRow } from "@/components/player/GameLog";
import ShowMore from "@/components/ShowMore";
import BandPhoto from "./BandPhoto";
import { Notice, Numbers, SeasonNumbers, StatusBadge, SummaryLines } from "./FormSummary";
import GameBars from "./GameBars";
import MyPlayerToggle from "./MyPlayerToggle";
import { barSlots } from "./columns";
import { metaLine, periodLabel, periodNote, statusLine } from "./formLabels";
import { cacheLife } from "next/cache";

interface Props {
  entry: MyPlayer;
  days: number;
  statsAvailable: boolean;
  /** '내 선수'로 골라 둔 선수인지(별 버튼 처음 상태). 내 선수 화면은 모두 골라 둔 선수라 기본값이 true다 */
  isMine?: boolean;
  /** 선수 이름의 제목 단계. 내 선수 화면은 h2, 섹션 제목(h2) 아래에 놓는 비시즌 홈은 h3 */
  nameAs?: "h2" | "h3";
}

/**
 * 내 선수 한 명의 카드: 팀 색 무대(상태 배지 + 사진) → 이름 → 출전 줄·한 줄 소식 → 큰 숫자와 작은 숫자 셋 →
 * 경기별 막대 → 경기별 기록 모두 보기. 마이너에 있으면 숫자·막대가 마이너 기록이고(이름표에 단계),
 * 비시즌·FA면 기간 대신 시즌 합계를 보인다(이슈 #13). 비시즌 홈도 같은 카드로 선수 6명을 보인다.
 */
export default async function FormCard({ entry, days, statsAvailable, isMine = true, nameAs: Name = "h2" }: Props) {
  // 잠깐 재사용: 같은 데이터면 30초 동안 그려 둔 것을 다시 쓴다(쿠키와 상관없는 부품이라 모두에게 같다).
  // 운영 서버(라즈베리파이 4)는 화면 그리기가 느려서 큰 부품을 매번 그리지 않는다.
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  const { player, games, fromKst, toKst, basis, level } = entry;
  const meta = metaLine(entry);
  const note = periodNote(entry, days);
  const period = entry.hitting ?? entry.pitching;
  const pitcher = player.role === "PITCHER";
  // FA·국내 복귀도 직전 MLB 팀 색(사진 모자와 같은 팀). 팀을 모르면 teamColor가 회색 기본값을 준다
  const team = teamColor(player.teamAbbr);
  const minors = level != null && level !== "MLB";
  const showsGames = statsAvailable && basis !== "SEASON" && basis !== "NONE" && games.length > 0;

  return (
    // 이름 링크를 카드 전체로 넓혀서(after:absolute) 카드 어디를 눌러도 선수 페이지로 간다(이슈 #155, 선수 목록 카드와 같은 방식).
    // 화면 낭독기는 이름만 읽는다. 별·막대·펼치기는 링크 위(relative z-10)에 올려 제 동작만 한다.
    <li className="card card-link relative flex flex-col overflow-hidden has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent">
      {/* isolate: 상태 배지의 z-10이 무대 안에서만 통하게 해서, 배지를 눌러도 카드 링크로 간다 */}
      <div className="player-stage isolate h-[5.75rem]" style={{ "--team": team } as CSSProperties}>
        {entry.status && <StatusBadge status={entry.status} />}
        <BandPhoto nameKo={player.nameKo} photoUrl={player.photoUrl} teamAbbr={player.teamAbbr} />
      </div>

      <div className="flex flex-1 flex-col px-4 pb-2 pt-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Name className="text-xl font-extrabold leading-snug tracking-[-0.02em]">
              <Link
                href={`/players/${player.id}`}
                className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
              >
                {player.nameKo}
              </Link>
            </Name>
            {meta && <p className="text-[0.8125rem] text-muted">{meta}</p>}
            {/* 기간을 당긴 카드(마지막으로 뛴·다치기 전): 어느 기간인지 적는다 */}
            {note && statsAvailable && <p className="mt-0.5 text-xs text-muted">{note}</p>}
          </div>
          <MyPlayerToggle
            playerId={player.id}
            nameKo={player.nameKo}
            initialOn={isMine}
            variant="icon"
            className="relative z-10 -mr-2 -mt-1"
          />
        </div>

        {statsAvailable && <SummaryLines entry={entry} />}

        {!statsAvailable ? (
          <Notice>아직 경기별 기록을 받지 못했어요.</Notice>
        ) : basis === "SEASON" && entry.seasonTotals ? (
          <SeasonNumbers totals={entry.seasonTotals} pitcher={pitcher} />
        ) : basis === "NONE" ? (
          // 새 마이너 팀 합류처럼 상태 줄이 이미 까닭을 말하면 더 쓰지 않는다
          entry.status?.kind === "IL" ? (
            <Notice>이번 시즌 아직 메이저 경기가 없어요.</Notice>
          ) : (
            !statusLine(entry) && <Notice>이번 시즌 아직 경기 기록이 없어요.</Notice>
          )
        ) : period ? (
          <>
            {entry.hitting && (
              <HitterNumbers period={periodLabel(basis, level, days, entry.isFallback)} hitting={entry.hitting} />
            )}
            {entry.pitching && (
              <PitcherNumbers period={periodLabel(basis, level, days, entry.isFallback)} pitching={entry.pitching} />
            )}
            {/* 기간이 바뀌면 막대 자리도 바뀌므로 고른 막대를 처음부터 다시 정한다(key).
                막대 사이 빈틈을 잘못 눌러 페이지가 바뀌지 않게 그래프 묶음 전체를 링크 위에 둔다 */}
            <div data-no-press className="relative z-10">
              <GameBars
                key={`${fromKst}~${toKst}`}
                slots={barSlots(fromKst, toKst, games)}
                role={player.role}
                days={days}
                minors={minors}
              />
            </div>
          </>
        ) : (
          <Notice>아직 이 선수의 기록을 연결하지 못했어요.</Notice>
        )}

        {/* 펼치면 경기별 기록이 버튼 위에 붙고, 버튼은 카드 맨 아래에서 '접기'가 된다 */}
        {showsGames && (
          // 펼친 경기 목록도 읽는 곳이라 링크 위에 둔다
          <div data-no-press className="relative z-10 mt-auto pt-3">
            <ShowMore moreLabel={`경기별 기록 ${games.length}개 모두 보기`} buttonClassName="rounded-lg py-2">
              <ul className="-mx-4 border-y border-line divide-y divide-line">
                {games.map((game) => (
                  <GameRow key={game.gameId} game={game} />
                ))}
              </ul>
            </ShowMore>
          </div>
        )}
      </div>
    </li>
  );
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
