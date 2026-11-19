import type { MyPlayer, OffSeason } from "@/lib/api";
import { getMyPlayers, getPlayers } from "@/lib/api";
import { formatUsDate } from "@/lib/format";
import { readMyPlayers } from "@/lib/myPlayers";
import ApiErrorNotice from "@/components/ApiErrorNotice";
import Section from "@/components/Section";
import FormCard from "@/components/my/FormCard";
import SeasonReportList from "@/components/home/SeasonReportList";
import MyPlayersLink from "@/components/home/MyPlayersLink";

/** 비시즌 카드는 시즌 합계라 기간이 뜻이 없다. /api/my가 요구하는 기간만 채운다 */
const DAYS = 7;

/** 성적표가 홈 맨 위일 때 사진을 바로 받을(eager) 앞 줄 수: 첫 화면 안 줄(맨 위 줄은 처음부터 펼쳐 둔다), 전수조사 L270 */
const EAGER_ROWS = 2;

/** 올해 메이저 출전(타자 경기·투수 등판). 사람들이 더 챙겨 보는 선수일수록 많다 */
function majorGames(e: MyPlayer): number {
  return e.seasonTotals?.mlb?.games ?? 0;
}

/**
 * 카드 순서: 내 선수 → 올해 메이저에서 많이 뛴 선수 → 명단 순서. 국내 리그로 돌아간 선수는 맨 끝(이제 해외파가 아니다).
 * FA인지는 순서에 넣지 않는다(배지로 보인다). 그래서 메이저 4경기 FA가 143경기 선수보다 앞서지 않는다.
 */
function order(entries: MyPlayer[], myIds: number[]): MyPlayer[] {
  const rank = (e: MyPlayer) => (e.status?.kind === "KBO" ? 2 : myIds.includes(e.player.id) ? 0 : 1);
  return [...entries].sort((a, b) => rank(a) - rank(b) || majorGames(b) - majorGames(a));
}

/**
 * 성적표 순서: 내 선수 → 서버 순서(시즌 판정 순, 같은 판정이면 메이저 경기 많은 순). 내 선수끼리도 서버 순서다.
 * 처음 펼쳐 둘 줄이 맨 위 줄이라 내 선수가 있으면 내 선수가 펼쳐진다(사용자 11-17 '처음엔 내 선수, 없으면 맨 위').
 * 성적표가 없는 선수(서버가 그 선수만 만들지 못한 경우)는 맨 끝.
 */
function reportOrder(entries: MyPlayer[], reportIndex: Map<number, number>, myIds: number[]): MyPlayer[] {
  const rank = (e: MyPlayer) => reportIndex.get(e.player.id) ?? Number.MAX_SAFE_INTEGER;
  const mine = (e: MyPlayer) => (myIds.includes(e.player.id) ? 0 : 1);
  return [...entries].sort((a, b) => mine(a) - mine(b) || rank(a) - rank(b));
}

/**
 * 머리 한 줄(흐린 글자): "2027 개막 D-132 · 3월 25일(목, 미국) · FA 2명". 개막일은 D-day와 날짜를 함께 쓴다
 * (예전에는 아래 문장 '2027 정규시즌은 미국 날짜로 …에 시작해요.'가 같은 말을 한 번 더 했다, 사용자 11-13 시안 C).
 * '2026 시즌 끝'도 쓰지 않는다: 제목이 '2026 시즌 성적표'라 비시즌인 게 보인다.
 * 예전에는 흰 알약 둘이었는데, 누를 수 없는 이름표라 알약을 아끼려고 글자로 바꿨다(이슈 #276, 알약은 누르는 것·드문 상태만).
 * 개막일은 MLB 일정 그대로의 미국 날짜(시각 없음)라 날짜 뒤에 '미국'을 붙인다. 사이트의 다른 날짜는 한국 날짜다(전수조사).
 */
function summaryParts(offseason: OffSeason, entries: MyPlayer[]): string[] {
  const out: string[] = [];
  const days = offseason.daysToOpening;
  if (days == null) {
    out.push(`${offseason.nextSeason} 개막일 발표 전`);
  } else {
    const day = formatUsDate(offseason.nextOpeningDay);
    out.push(days > 0 ? `${offseason.nextSeason} 개막 D-${days}${day !== "-" ? ` · ${day}` : ""}` : `${offseason.nextSeason} 오늘 개막`);
  }
  const freeAgents = entries.filter((e) => e.status?.kind === "FA").length;
  if (freeAgents > 0) out.push(`FA ${freeAgents}명`);
  return out;
}

/**
 * 비시즌 홈의 첫 묶음(홈 응답에 offseason이 있을 때). 지난 경기 한 줄과 '한국 선수 중 1위' 카드 대신 선수 전원의 시즌을 보인다.
 * 서버가 성적표를 주면 흰 카드 한 장 안 한 줄 목록(누르면 펼치기, 이슈 #276), 옛 api면 '내 선수' 카드의 시즌 합계 모양 카드.
 * 별은 실제로 '내 선수'로 골랐는지를 따른다.
 */
export default async function OffseasonPlayers({
  offseason,
  asOf,
  onTop = false,
}: {
  offseason: OffSeason;
  /** 제목 옆 데이터 기준 시각("기준 11월 17일(화) 09:00"). 이 묶음이 홈 맨 위일 때만(MLB 도전 카드가 없을 때) 받는다(이슈 #277) */
  asOf?: string;
  /** 이 묶음이 홈 맨 위면(MLB 도전 카드가 없을 때) true: 성적표 앞 줄 사진을 바로 받는다(첫 화면 안) */
  onTop?: boolean;
}) {
  const [myResult, myIds, playersResult] = await Promise.all([
    offseason.playerIds.length > 0 ? getMyPlayers(offseason.playerIds, DAYS) : Promise.resolve(null),
    readMyPlayers(),
    getPlayers(),
  ]);
  // 입구에 보일 '내 선수 n명'은 /my 머리말과 같은 기준으로 센다: 쿠키에 남은 없는 선수 id는 뺀다(리뷰 지적, 이슈 #262).
  // 선수 목록을 못 받았으면 쿠키 그대로
  const myCount = playersResult.ok
    ? myIds.filter((id) => playersResult.data.some((p) => p.id === id)).length
    : myIds.length;
  const my = myResult?.ok ? myResult.data : null;
  // 서버가 성적표를 주면(사용자 11-12 결정 '시즌 성적표') 내 선수 다음 그 순서로, 아니면(옛 api) 예전 순서와 카드로
  const reportIndex = new Map((offseason.report ?? []).map((r, i) => [r.playerId, i]));
  const hasReport = reportIndex.size > 0;
  const entries = my ? (hasReport ? reportOrder(my.players, reportIndex, myIds) : order(my.players, myIds)) : [];
  // 제목 옆은 기준 시각만(예전 '내 선수 먼저 · 시즌 판정 순'은 별 표시가 내 선수를 보이고 순서 까닭은 읽는 데 필요 없어 뺐다, 이슈 #329)
  const aside = asOf;

  return (
    <Section
      id="offseason-title"
      title={hasReport ? `${offseason.season} 시즌 성적표` : `${offseason.season} 시즌 끝`}
      aside={aside}
    >
      {/* 큰 글씨에서 둘이 한 줄에 못 들어가면 '내 선수 n명'이 다음 줄 오른쪽으로 내려간다 */}
      <div className="-mt-0.5 mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
        <p className="text-caption text-muted tabular-nums">{summaryParts(offseason, entries).join(" · ")}</p>
        {/* '내 선수'(/my)로 가는 입구(이슈 #262). 줄 오른쪽 끝 */}
        <span className="ml-auto">
          <MyPlayersLink count={myCount} />
        </span>
      </div>

      {myResult && !myResult.ok ? (
        // /api/my는 404를 주지 않는다. 404면 api가 이 기능보다 오래된 것이다.
        <ApiErrorNotice failure={myResult.failure === "notFound" ? "badResponse" : myResult.failure} />
      ) : !my || entries.length === 0 ? (
        <p className="card px-4 py-6 text-body text-muted">선수 기록이 모이면 선수별 시즌 성적이 여기에 나와요.</p>
      ) : hasReport ? (
        <SeasonReportList
          entries={entries}
          reports={offseason.report ?? []}
          myIds={myIds}
          eagerPhotos={onTop ? EAGER_ROWS : 0}
        />
      ) : (
        // 옛 api(성적표 없음): 시즌 합계 카드. 같은 줄 카드는 높이를 맞춘다(시즌 합계 카드는 펼치는 목록이 없다)
        <ul className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <FormCard
              key={entry.player.id}
              entry={entry}
              days={my.days}
              statsAvailable={my.statsAvailable}
              isMine={myIds.includes(entry.player.id)}
              nameAs="h3"
            />
          ))}
        </ul>
      )}
    </Section>
  );
}
