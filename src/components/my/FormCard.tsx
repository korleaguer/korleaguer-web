import type { CSSProperties } from "react";
import Link from "next/link";
import type { GameLine, HitterPeriod, MyPlayer, PitcherPeriod } from "@/lib/api";
import { formatEra, formatRate } from "@/lib/format";
import { leagueWords, periodEraPlus } from "@/lib/leagueWords";
import { periodWrcPlus } from "@/lib/wrcTrend";
import { teamColor } from "@/lib/teams";
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
 * 경기별 막대 → 경기 기록 링크(선수 페이지 경기 기록 칸). 마이너에 있으면 숫자·막대가 마이너 기록이고(이름표에 단계),
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
    // 화면 낭독기는 이름만 읽는다. 별·막대·경기 기록 링크는 링크 위(relative z-10)에 올려 제 동작만 한다.
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

      {/* 아래 여백: '경기 기록' 링크로 끝나면 링크가 제 위아래 여백을 가져 8px, 숫자 칸·안내로 끝나면 좌우와 같은 16px
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

        {/* 아래 묶음(큰 숫자·막대·기록 링크)은 카드 바닥에 붙인다: 같은 줄 카드는 높이가 같고(목록이 stretch), 위 줄이 선수마다
            있다 없다 해도 큰 숫자와 바닥선이 같은 자리에 선다(사용자 11-16·11-21 '들쭉날쭉', 한 줄 카드 244·273·297px) */}
        <div className="mt-auto flex flex-col">
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
              <HitterNumbers period={periodLabel(basis, level, days, entry.isFallback)} hitting={entry.hitting} games={games} minors={minors} />
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

        {/* 경기별 기록은 카드 안에서 펼치지 않고(아래 카드가 밀렸다, 이슈 #326) 선수 페이지 '경기 기록' 칸으로 보낸다.
            카드 전체가 선수 페이지 링크(after:absolute)라 이 링크는 그 위(relative z-10)에 올려 제 주소로 간다 */}
        {showsGames && (
          <div data-no-press className="relative z-10 pt-3">
            <Link
              href={`/players/${player.id}#games-title`}
              className="press-soft flex min-h-11 w-full items-center justify-center gap-0.5 rounded-lg py-2 text-label text-accent-ink hover:underline"
            >
              <span className="sr-only">{`${player.nameKo} `}</span>
              경기 기록
              <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
                <path d="m6 4 4 4-4 4" />
              </svg>
            </Link>
          </div>
        )}
        </div>
      </div>
    </li>
  );
}

function HitterNumbers({ period, hitting, games, minors }: { period: string; hitting: HitterPeriod; games: GameLine[]; minors: boolean }) {
  return (
    <Numbers
      label={`${period} 타율`}
      value={formatRate(hitting.avg)}
      note={
        <RateDelta
          plus={periodWrcPlus(games)}
          atBats={hitting.atBats}
          played={hitting.games > 0}
          hasAvg={hitting.avg != null}
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
      note={
        <EraDelta
          era={pitching.era}
          outs={pitching.outs}
          inningsText={pitching.inningsText}
          played={pitching.games > 0}
          minors={minors}
        />
      }
      small={[
        ["등판", pitching.games],
        ["이닝", pitching.inningsText],
        ["탈삼진", pitching.strikeouts],
      ]}
    />
  );
}

/**
 * 기간 타율을 리그 평균과 견줘도 되는 가장 적은 타수. 이보다 적으면 말 없이 '참고용'이라고만 쓴다.
 * 타율의 표본 흔들림(표준편차)이 20타수에서 약 .10(√(.25×.75÷20))이라, 그 안쪽 차이는 실력 차이로 읽으면 안 된다.
 * 타자 기간 카드에는 타석 기준(STEADY)이 따로 없어 이 카드에 맞게 정했다. 한 주(7일) 정규 타자가 대개 20타수 안팎이라,
 * 한 주를 거의 다 뛴 선수는 비교하고 반 주만 뛴 선수(6타수 등)는 참고용으로 갈린다(운영 데이터 11-19: 이정후 7일 21타수, 송성문 7일 6·14일 9타수)
 */
const MIN_AT_BATS_FOR_DELTA = 20;

/**
 * 큰 숫자(타율) 아래 판정 한 줄: 기간 기록을 리그 평균과 견준 말('평균보다 30% 잘 침', 사용자 11-21). 시즌 타율과 견줘 ▲▼로 말하던 것을 대신한다.
 * 타율 하나로 좋아졌는지 말하지 않는다(볼넷·장타가 빠진다). 말은 기간 wRC+(lib/wrcTrend periodWrcPlus)에서 나온다.
 * 마이너 기록은 그 단계 리그 평균이 화면에 없어(메이저 평균으로 재면 높게 나온다) 견주지 않는다.
 * 평균 위만 주황(좋은 활약 색), 아래는 색 없이 본문 글자. 카드마다 이 줄은 한 줄 자리를 늘 가진다(같은 줄 카드 높이를 맞추려고)
 */
function RateDelta({
  plus,
  atBats,
  played,
  hasAvg,
  minors,
}: {
  plus: number | null;
  atBats: number;
  played: boolean;
  hasAvg: boolean;
  minors: boolean;
}) {
  if (!played) return <>이 기간 출전 없음</>;
  if (!hasAvg) return <>이 기간 타수 없음</>;
  if (minors) return <>마이너라 평균 비교 없음</>;
  if (plus == null) return <>&nbsp;</>;
  if (atBats < MIN_AT_BATS_FOR_DELTA) return <>{`${atBats}타수라 참고용`}</>;
  return <Verdict plus={plus} pitcher={false} />;
}

/**
 * 기간 평균자책점을 리그 평균과 견줘도 되는 가장 적은 아웃 수(9아웃 = 3이닝). 이보다 적으면 말 없이 '참고용'이라고만 쓴다.
 * 3이닝 평균자책점은 실점 한 점에 4.5점이 움직이고, 불펜 투수의 한 주 등판이 대개 3이닝 안팎이라 한 번 던진 투수와 갈린다
 */
const MIN_OUTS_FOR_DELTA = 9;

/** 투수 판정 한 줄: 기간 평균자책점을 리그 평균 평균자책점과 견준 말('평균보다 30% 잘 막음'). 기준은 타자 RateDelta와 같다 */
function EraDelta({
  era,
  outs,
  inningsText,
  played,
  minors,
}: {
  era: number | null;
  outs: number;
  inningsText: string;
  played: boolean;
  minors: boolean;
}) {
  if (!played) return <>이 기간 등판 없음</>;
  if (minors) return <>마이너라 평균 비교 없음</>;
  if (era == null) return <>&nbsp;</>;
  if (outs < MIN_OUTS_FOR_DELTA) return <>{`${inningsText}이닝이라 참고용`}</>;
  return <Verdict plus={periodEraPlus(era)} pitcher />;
}

/** 리그 대비 말 한 줄. 평균 위만 주황 굵게(좋은 활약 색), 비슷·아래는 색 없이 본문 글자. 숫자는 굵게 */
function Verdict({ plus, pitcher }: { plus: number; pitcher: boolean }) {
  const w = leagueWords(plus, pitcher);
  return (
    <span className={w.tone === "up" ? "font-semibold text-hot-ink" : "text-foreground"}>
      {w.lead}
      {w.num && <span className="font-bold tabular-nums">{w.num}</span>}
      {w.tail}
    </span>
  );
}
