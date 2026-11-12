import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getHome, getMyPlayers, getPlayers } from "@/lib/api";
import { formatDateRange } from "@/lib/format";
import { readMyPlayers } from "@/lib/myPlayers";
import ApiErrorNotice from "@/components/ApiErrorNotice";
import DataBanners from "@/components/DataBanners";
import LoadingBlock from "@/components/LoadingBlock";
import FormCard from "@/components/my/FormCard";
import MyHeader from "@/components/my/MyHeader";
import StateNotice from "@/components/StateNotice";

// <title>: "내 선수 · KOR Leaguer". 사람마다 다른 화면이라 검색에는 올리지 않는다.
export const metadata: Metadata = {
  title: "내 선수",
  description: "고른 선수들의 최근 경기를 한곳에서 봐요.",
  robots: { index: false, follow: true },
};

const PERIODS = [7, 14, 30] as const;
type Period = (typeof PERIODS)[number];

/** ?days= 값. 7·14·30이 아니면 7 */
function parseDays(value: string | string[] | undefined): Period {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (PERIODS as readonly number[]).includes(n) ? (n as Period) : 7;
}

export default function MyPage({ searchParams }: PageProps<"/my">) {
  return (
    <Suspense fallback={<LoadingBlock rows={8} />}>
      <MyContent searchParams={searchParams} />
    </Suspense>
  );
}

async function MyContent({ searchParams }: Pick<PageProps<"/my">, "searchParams">) {
  const days = parseDays((await searchParams).days);
  const ids = await readMyPlayers();
  // 아무도 안 골랐으면 /api/my를 부를 수 없어서, 샘플 띠에 쓸 데이터 상태는 /api/home에서 받는다.
  const [playersResult, myResult, homeResult] = await Promise.all([
    getPlayers(),
    ids.length > 0 ? getMyPlayers(ids, days) : Promise.resolve(null),
    ids.length > 0 ? Promise.resolve(null) : getHome(),
  ]);
  if (!playersResult.ok) return <ApiErrorNotice failure={playersResult.failure} />;
  if (myResult && !myResult.ok) {
    // /api/my는 404를 주지 않는다. 404면 api가 이 기능보다 오래된 것이다.
    return <ApiErrorNotice failure={myResult.failure === "notFound" ? "badResponse" : myResult.failure} />;
  }

  const my = myResult?.data ?? null;
  const picked = my?.players ?? [];
  const status = my ?? (homeResult?.ok ? homeResult.data : null);
  // 고른 선수가 모두 시즌 합계 카드(시즌 끝·FA)면 기간이 뜻이 없다: 기간 알약·안내를 빼고 머리말을 시즌 합계로.
  // "비시즌이라"는 시즌 끝 카드가 있을 때만 쓴다(시즌 중에 FA 선수만 골랐을 수도 있다).
  const seasonView = picked.length > 0 && picked.every((e) => e.basis === "SEASON");
  const offSeason = picked.some((e) => e.status?.kind === "SEASON_OVER");
  // '마지막으로 뛴 날까지' 안내는 실제로 그 기간을 보이는 카드가 있을 때만(마이너·부상자 명단 카드는 제 기간을 따로 적는다)
  const showFallbackNote = picked.some(
    (e) => e.basis === "LAST_PLAYED" || (e.basis === "REHAB" && e.isFallback),
  );
  const subtitle = !my
    ? "좋아하는 선수를 골라 두면 최근 경기를 한곳에서 볼 수 있어요"
    : seasonView
      ? `고른 선수 ${picked.length}명 · ${offSeason ? "비시즌이라 " : ""}${my.season} 시즌 합계`
      : `고른 선수 ${picked.length}명 · ${formatDateRange(my.fromKst, my.toKst)}`;

  return (
    <div className="space-y-4">
      {status && <DataBanners dataMode={status.dataMode} statsAvailable={status.statsAvailable} />}
      {/* 쿠키에 남은 없는 선수 id는 빼고 넘긴다 */}
      <MyHeader subtitle={subtitle} players={playersResult.data} selectedIds={picked.map((e) => e.player.id)} />

      {my && picked.length > 0 ? (
        <>
          {!seasonView && <PeriodTabs days={days} />}
          {!seasonView && showFallbackNote && (
            <p className="px-1 text-[0.8125rem] text-muted">
              {`최근 ${days}일에 경기가 없는 선수는 그 선수가 마지막으로 뛴 날까지 ${days}일을 보여 줘요.`}
            </p>
          )}
          <ul className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {picked.map((entry) => (
              <FormCard key={entry.player.id} entry={entry} days={my.days} statsAvailable={my.statsAvailable} />
            ))}
          </ul>
        </>
      ) : (
        // 아무도 안 골랐으면 위 '선수 고르기' 목록이 열려 있어서 따로 버튼을 두지 않는다
        <StateNotice
          emoji="⭐"
          title="아직 고른 선수가 없어요"
          detail="위 목록에서 챙겨 볼 선수를 누르면 여기에 선수마다 카드가 생겨요."
        />
      )}
    </div>
  );
}

/** 기간 알약: 최근 7일 · 14일 · 30일. 주소(?days=)로 바꾼다 */
function PeriodTabs({ days }: { days: Period }) {
  return (
    <nav aria-label="기간" className="flex gap-1.5 px-1">
      {PERIODS.map((d) => {
        const current = d === days;
        return (
          <Link
            key={d}
            href={d === 7 ? "/my" : `/my?days=${d}`}
            scroll={false}
            aria-current={current ? "page" : undefined}
            className={`press rounded-full px-3 py-1 text-[0.8125rem] font-semibold ${current ? "bg-accent-soft text-accent-ink" : "bg-surface text-muted hover:text-foreground"}`}
          >
            {d === 7 ? "최근 7일" : `${d}일`}
          </Link>
        );
      })}
    </nav>
  );
}
