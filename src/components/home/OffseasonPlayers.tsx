import type { MyPlayer, OffSeason } from "@/lib/api";
import { getMyPlayers } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { readMyPlayers } from "@/lib/myPlayers";
import ApiErrorNotice from "@/components/ApiErrorNotice";
import Section from "@/components/Section";
import FormCard from "@/components/my/FormCard";

/** 비시즌 카드는 시즌 합계라 기간이 뜻이 없다. /api/my가 요구하는 기간만 채운다 */
const DAYS = 7;

/** 카드 순서: 내 선수 → FA(최근에 FA가 된 선수부터) → 나머지(명단 순서) */
function order(entries: MyPlayer[], myIds: number[]): MyPlayer[] {
  const rank = (e: MyPlayer) => (myIds.includes(e.player.id) ? 0 : e.status?.kind === "FA" ? 1 : 2);
  const faDays = (e: MyPlayer) => (e.status?.kind === "FA" ? (e.status.days ?? Number.MAX_SAFE_INTEGER) : 0);
  return [...entries].sort((a, b) => rank(a) - rank(b) || faDays(a) - faDays(b));
}

/** 머리 알약: "2027 개막 D-134", "FA 3명" */
function pills(offseason: OffSeason, entries: MyPlayer[]): string[] {
  const out: string[] = [];
  const days = offseason.daysToOpening;
  if (days != null) out.push(days > 0 ? `${offseason.nextSeason} 개막 D-${days}` : `${offseason.nextSeason} 오늘 개막`);
  const freeAgents = entries.filter((e) => e.status?.kind === "FA").length;
  if (freeAgents > 0) out.push(`FA ${freeAgents}명`);
  return out;
}

/**
 * 비시즌 홈의 첫 묶음(홈 응답에 offseason이 있을 때). 지난 경기 한 줄과 '시즌 1위' 카드 대신
 * 선수 전원의 시즌 카드('내 선수' 카드의 시즌 합계 모양: 팀 색 무대·상태 배지·시즌 성적)를 보인다.
 * 별 버튼은 실제로 '내 선수'로 골랐는지를 따른다.
 */
export default async function OffseasonPlayers({ offseason }: { offseason: OffSeason }) {
  const [myResult, myIds] = await Promise.all([
    offseason.playerIds.length > 0 ? getMyPlayers(offseason.playerIds, DAYS) : Promise.resolve(null),
    readMyPlayers(),
  ]);
  const my = myResult?.ok ? myResult.data : null;
  const entries = my ? order(my.players, myIds) : [];
  const opening = offseason.nextOpeningDay
    ? `${offseason.nextSeason} 정규시즌은 미국 날짜로 ${formatDate(offseason.nextOpeningDay)}에 시작해요.`
    : `${offseason.nextSeason} 시즌 개막일은 아직 발표 전이에요.`;

  return (
    <Section id="offseason-title" title={`${offseason.season} 시즌 끝`}>
      <ul className="-mt-0.5 mb-2 flex flex-wrap gap-1.5 px-1">
        {pills(offseason, entries).map((part) => (
          <li
            key={part}
            className="rounded-full bg-surface px-2.5 py-0.5 text-[0.8125rem] font-semibold leading-5 text-neutral-pill-fg tabular-nums"
          >
            {part}
          </li>
        ))}
      </ul>
      <p className="mb-3 px-1 text-[0.8125rem] text-muted">{opening}</p>

      {myResult && !myResult.ok ? (
        // /api/my는 404를 주지 않는다. 404면 api가 이 기능보다 오래된 것이다.
        <ApiErrorNotice failure={myResult.failure === "notFound" ? "badResponse" : myResult.failure} />
      ) : !my || entries.length === 0 ? (
        <p className="card px-4 py-6 text-sm text-muted">선수 기록이 모이면 선수별 시즌 카드가 여기에 나옵니다.</p>
      ) : (
        <ul className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
