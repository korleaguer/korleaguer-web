import type { CSSProperties } from "react";
import Link from "next/link";
import type { HitterPeriod, MyPlayer, PitcherPeriod } from "@/lib/api";
import { formatEra, formatRate } from "@/lib/format";
import { teamColor } from "@/lib/teams";
import { GameRow } from "@/components/player/GameLog";
import ShowMore from "@/components/ShowMore";
import BandPhoto from "./BandPhoto";
import { Notice, Numbers, SeasonNumbers, StatusBadge, StatusSrText, SummaryLines } from "./FormSummary";
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
 * 경기별 막대 → 경기 기록 모두 보기. 마이너에 있으면 숫자·막대가 마이너 기록이고(이름표에 단계),
 * 비시즌·FA면 기간 대신 시즌 합계를 보인다(이슈 #13). 비시즌 홈도 같은 카드로 선수 6명을 보인다.
 */
export default async function FormCard({
  entry,
  days,
  statsAvailable,
  isMine = true,
  nameAs: Name = "h2",
}: Props) {
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
    // data-player-id: 별로 이 카드를 빼서 포커스가 사라지면 옆 카드 이름으로, 알림의 '되돌리기'로 되살리면 이 카드 별로
    // 옮길 때 찾는다(useFocusAfterRemove)
    <li
      data-player-id={player.id}
      className="card card-link relative flex flex-col overflow-hidden has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent"
    >
      {/* isolate: 상태 배지의 z-10이 무대 안에서만 통하게 해서, 배지를 눌러도 카드 링크로 간다 */}
      <div className="player-stage @container isolate h-[92px]" style={{ "--team": team } as CSSProperties}>
        {entry.status && <StatusBadge status={entry.status} />}
        {/* 사진을 바로 받을지는 카드 밖 목록이 PhotoPriority로 건넨다(props면 "use cache" 열쇠가 자리마다 갈린다) */}
        <BandPhoto nameKo={player.nameKo} photoUrl={player.photoUrl} teamAbbr={player.teamAbbr} />
      </div>

      {/* 아래 여백: '경기 기록 모두 보기' 버튼으로 끝나면 버튼이 제 위아래 여백을 가져 8px, 숫자 칸·안내로 끝나면 좌우와 같은 16px
          (8px이면 비시즌 카드 6장 모두 숫자 칸 아래가 좌우 여백의 절반이라 답답했다, 11-17 점검) */}
      <div className={`flex flex-1 flex-col px-4 pt-3 ${showsGames ? "pb-2" : "pb-4"}`}>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Name className="text-title">
              <Link
                href={`/players/${player.id}`}
                className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
              >
                {player.nameKo}
              </Link>
              {/* 무대의 상태 배지는 이름보다 앞에 그려져 화면 낭독기에서 감추고, 여기(이름 뒤)에서 읽는다 */}
              {entry.status && <StatusSrText status={entry.status} />}
            </Name>
            {meta && <p className="text-meta text-muted">{meta}</p>}
            {/* 기간을 당긴 카드(마지막으로 뛴·다치기 전): 어느 기간인지 적는다 */}
            {note && statsAvailable && <p className="mt-0.5 text-caption text-muted">{note}</p>}
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
          <Notice>아직 경기 기록을 받지 못했어요.</Notice>
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
              <HitterNumbers period={periodLabel(basis, level, days, entry.isFallback)} hitting={entry.hitting} minors={minors} />
            )}
            {entry.pitching && (
              <PitcherNumbers period={periodLabel(basis, level, days, entry.isFallback)} pitching={entry.pitching} minors={minors} />
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
                name={player.nameKo}
              />
            </div>
          </>
        ) : (
          <Notice>아직 이 선수 기록이 없어요.</Notice>
        )}

        {/* 펼치면 경기별 기록이 버튼 위에 붙고, 버튼은 카드 맨 아래에서 '접기'가 된다 */}
        {showsGames && (
          // 펼친 경기 목록도 읽는 곳이라 링크 위에 둔다
          <div data-no-press className="relative z-10 mt-auto pt-3">
            <ShowMore moreLabel="경기 기록 모두 보기" buttonClassName="rounded-lg py-2" srContext={player.nameKo}>
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

function HitterNumbers({ period, hitting, minors }: { period: string; hitting: HitterPeriod; minors: boolean }) {
  return (
    <Numbers
      label={`${period} 타율`}
      value={formatRate(hitting.avg)}
      note={
        <RateDelta
          value={hitting.avg}
          season={hitting.seasonAvg}
          atBats={hitting.atBats}
          played={hitting.games > 0}
          minors={minors}
        />
      }
      // 경기를 먼저 쓴다: '안타·홈런·타점'만으로는 몇 경기 기록인지 몰랐다(11-17 점검, 비시즌 시즌 합계 카드와 같은 순서). 투수는 등판 먼저
      small={[
        ["경기", hitting.games],
        ["안타", hitting.hits],
        ["홈런", hitting.homeRuns],
      ]}
    />
  );
}

function PitcherNumbers({ period, pitching, minors }: { period: string; pitching: PitcherPeriod; minors: boolean }) {
  return (
    <Numbers
      label={`${period} 평균자책점`}
      value={formatEra(pitching.era)}
      note={<EraDelta value={pitching.era} season={pitching.seasonEra} played={pitching.games > 0} minors={minors} />}
      small={[
        ["등판", pitching.games],
        ["이닝", pitching.inningsText],
        ["탈삼진", pitching.strikeouts],
      ]}
    />
  );
}

/**
 * 비교하는 시즌 이름. 마이너 카드의 시즌 값은 그해 마이너 전체(여러 단계를 더한 값)라 '마이너 시즌'이다.
 * 그냥 '시즌 .262보다'면 트리플A 최근 기록을 메이저 시즌과 견준 것처럼 읽혔다(11-17 점검)
 */
function seasonName(minors: boolean): string {
  return minors ? "마이너 시즌" : "시즌";
}

/**
 * 기간 타율을 시즌과 견줘도 되는 가장 적은 타수. 이보다 적으면 차이를 색·화살표로 보이지 않고 '참고용'이라고만 쓴다.
 * 타율의 표본 흔들림(표준편차)이 20타수에서 약 .10(√(.25×.75÷20))이라, 그 안쪽 차이(▲.142 같은 값)는 실력 차이로 읽으면 안 된다.
 * 타자 기간 카드에는 타석 기준(STEADY)이 따로 없어 이 카드에 맞게 정했다. 한 주(7일) 정규 타자가 대개 20타수 안팎이라,
 * 한 주를 거의 다 뛴 선수는 비교하고 반 주만 뛴 선수(6타수 등)는 참고용으로 갈린다(운영 데이터 11-19: 이정후 7일 21타수, 송성문 7일 6·14일 9타수)
 */
const MIN_AT_BATS_FOR_DELTA = 20;

/** "시즌 .301보다 ▲.047"(마이너 카드는 "마이너 시즌 .262보다"). 타수가 없거나 시즌 기록이 없으면 그 사실만. 타수가 적으면 "시즌 .191 · 6타수라 참고용" */
function RateDelta({
  value,
  season,
  atBats,
  played,
  minors,
}: {
  value: number | null;
  season: number | null;
  atBats: number;
  played: boolean;
  minors: boolean;
}) {
  if (!played) return <>이 기간 출전 없음</>;
  if (value == null) return <>이 기간 타수 없음</>;
  if (season == null) return null;
  if (atBats < MIN_AT_BATS_FOR_DELTA) return <>{`${seasonName(minors)} ${formatRate(season)} · ${atBats}타수라 참고용`}</>;
  // 소수 셋째 자리에서 비교해 화면 숫자와 어긋나지 않게 한다. 타율은 높을수록 좋다
  const diff = Math.round(value * 1000) - Math.round(season * 1000);
  return (
    <Delta
      seasonText={`${seasonName(minors)} ${formatRate(season)}`}
      diff={diff}
      better={diff > 0}
      amount={formatRate(Math.abs(diff) / 1000)}
    />
  );
}

/** "시즌 3.12보다 ▼0.85". 평균자책점은 낮을수록 좋다. 등판이 없거나 시즌 기록이 없으면 그 사실만 */
function EraDelta({ value, season, played, minors }: { value: number | null; season: number | null; played: boolean; minors: boolean }) {
  if (!played) return <>이 기간 등판 없음</>;
  if (season == null) return null;
  if (value == null) return <>{`${seasonName(minors)} ${formatEra(season)}`}</>;
  // 소수 둘째 자리(화면 숫자)에서 비교한다
  const diff = Math.round(value * 100) - Math.round(season * 100);
  return (
    <Delta
      seasonText={`${seasonName(minors)} ${formatEra(season)}`}
      diff={diff}
      better={diff < 0}
      amount={(Math.abs(diff) / 100).toFixed(2)}
    />
  );
}

/**
 * 시즌과 비교한 차이. 화살표는 숫자가 오른 쪽(▲)·내린 쪽(▼), 좋아지면 불꽃 주황(좋은 활약 색), 나빠지면 색 없이 본문 글자.
 * 예전에는 증권 화면처럼 나빠짐을 진한 파랑으로 칠했는데, 다른 화면의 파랑은 1위·좋음·고른 칸이라 같은 색이
 * 정반대 뜻이 됐다(11-17 점검, 사용자 결정 '추천대로'). 화면 낭독기는 "좋아짐/나빠짐"도 읽는다.
 */
function Delta({ seasonText, diff, better, amount }: { seasonText: string; diff: number; better: boolean; amount: string }) {
  if (diff === 0) return <>{`${seasonText} · 차이 없음`}</>;
  const up = diff > 0;
  return (
    <span className="inline-flex items-center gap-0.5">
      {`${seasonText}보다`}
      <span className={`ml-0.5 inline-flex items-center gap-0.5 font-semibold ${better ? "text-hot-ink" : "text-foreground"}`}>
        <svg aria-hidden viewBox="0 0 10 10" className={`size-2.5 fill-current ${up ? "" : "rotate-180"}`}>
          <path d="M5 1.5 9 8.5H1z" />
        </svg>
        <span className="sr-only">{`${up ? "높음" : "낮음"}, ${better ? "좋아짐" : "나빠짐"}`}</span>
        <span className="tabular-nums">{amount}</span>
      </span>
    </span>
  );
}
