import type { Metadata } from "next";
import { getHome, getRecords, getTeamAbbrById, type RecordNext, type RecordsResponse } from "@/lib/api";
import { shareMeta, SITE_NAME } from "@/lib/share";
import ApiErrorNotice from "@/components/ApiErrorNotice";
import AppShape, { type RecordsOrder } from "@/components/AppShape";
import DataBanners from "@/components/DataBanners";
import { RecordsSkeleton } from "@/components/PageSkeleton";
import PageSuspense from "@/components/PageSuspense";
import PillNav from "@/components/PillNav";
import Section from "@/components/Section";
import ShowMore from "@/components/ShowMore";
import StateNotice from "@/components/StateNotice";
import { BestRow, groupPassed, LeaderRow, NextRow, PassedRow } from "@/components/records/RecordRows";

/**
 * 화면 제목. 무슨 기록인지 제목에서 밝힌다. 사이트 곳곳의 '기록'은 선수 성적(선수별 기록·경기 기록)을 뜻해서
 * '기록'이라는 이름만으로는 역대 순위 화면인 줄 몰랐다(11-17 UI/UX 전수조사, 사용자 결정 '추천대로')
 */
const TITLE = "한국인 메이저리거 역대 기록";
// <title>: "한국인 메이저리거 역대 기록 · KOR Leaguer" (뒷부분은 layout의 template이 붙인다)
// 공유 카드 제목은 목록 화면 규칙대로 사이트 이름을 붙인다('… · KOR Leaguer', lib/share.ts shareMeta). 카카오톡 카드는
// og:site_name을 보이지 않는다
// 설명은 공유 카드에 제목(TITLE)과 함께 나오므로 제목의 말을 되풀이하지 않는다
const DESCRIPTION = "박찬호부터 이정후까지 통산 순위와 한 시즌 최다, 지금 선수가 넘은 기록과 다음에 넘을 기록.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // 공유 주소(og:url)는 두지 않는다. 고른 순위표(?stat=홈런 등)를 보낸 링크가 '/records'의 첫 순위표로 열린다
  ...shareMeta(`${TITLE} · ${SITE_NAME}`, DESCRIPTION),
};

type Props = PageProps<"/records">;

/** 순위표에서 처음 보이는 줄 수. 나머지는 '더 보기' */
const TOP = 10;
/**
 * '넘은 기록'에 넣는 기록의 하한(넘은 선수의 통산 값). 도루 1개·타점 5개처럼 잠깐 뛴 선수를 넘은 것은 이야기가 안 된다
 * (2026 운영 데이터: 21번 중 값 10 미만 8번을 빼면 13번, 남는 것은 강정호 233안타·이대호 14홈런 같은 것)
 */
const PASSED_MIN = 10;
/** '넘은 기록'에서 처음 보이는 묶음 수. 나머지는 '더 보기' */
const PASSED_SHOWN = 6;
/** 남은 것이 이만큼 이하면 버튼을 두지 않고 처음부터 모두 보인다(1~2개를 위해 버튼 하나를 누르게 하지 않는다, 이슈 #326) */
const PASSED_REST_MIN = 3;
/** '다음에 넘을 기록'에 보이는 선수 수 */
const NEXT_PLAYERS = 4;

/**
 * 기록 화면(이슈 #244). 11-19에 위 메뉴·앱 아래 탭에서 뺐다(이슈 #323: 매일 올 화면이 아니라는 판단). 검색 유입과
 * 옛 앱(4번째 칸이 이 주소를 연다)을 위해 페이지와 주소는 그대로 둔다. 한국인 메이저리거 역대 순위와 지금 선수가
 * 넘은·넘을 기록. 시즌 중엔 '다음에 넘을 기록'이 맨 위(경기마다 줄어든다), 비시즌엔 이번 시즌 결산(넘은 기록)이 맨 위다.
 */
export default function RecordsPage({ searchParams }: Props) {
  return (
    <div className="space-y-4">
      <h1 className="px-1 text-display">{TITLE}</h1>
      <PageSuspense fallback={<RecordsSkeleton />}>
        <RecordsContent searchParams={searchParams} />
      </PageSuspense>
    </div>
  );
}

/** 선수마다 넘기 쉬운 것 하나(api가 넘기 쉬운 순으로 준다) */
function nextPerPlayer(next: RecordNext[]): RecordNext[] {
  const seen = new Set<string>();
  return next.filter((n) => (seen.has(n.nameKo) ? false : (seen.add(n.nameKo), true))).slice(0, NEXT_PLAYERS);
}

function pick(value: string | string[] | undefined, keys: string[], fallback: string): string {
  return typeof value === "string" && keys.includes(value) ? value : fallback;
}

/** 순위표 위 기록 고르기 알약(주소 ?stat=·?best=에 둔다. 같은 화면이라 맨 위로 튀지 않게) */
function StatPills({
  label,
  param,
  items,
  current,
  other,
}: {
  label: string;
  param: "stat" | "best";
  items: { key: string; label: string }[];
  current: string;
  other: Record<string, string>;
}) {
  const href = (key: string) => {
    const query = new URLSearchParams({ ...other, [param]: key });
    return `/records?${query.toString()}`;
  };
  return (
    <PillNav
      label={label}
      scroll={false}
      className="no-scrollbar -mx-1 mb-1 gap-1 overflow-x-auto overflow-y-hidden px-1 py-[max(0.375rem,calc(22px-1rem))]"
      itemClass="whitespace-nowrap px-3 py-1.5 text-button"
      idleClass="text-muted hover:bg-surface-2 hover:text-foreground"
      items={items.map((i) => ({ href: href(i.key), label: i.label, current: i.key === current ? "page" : undefined }))}
    />
  );
}

async function RecordsContent({ searchParams }: Pick<Props, "searchParams">) {
  const [params, result, home, teams] = await Promise.all([searchParams, getRecords(), getHome(), getTeamAbbrById()]);
  const teamOf = (id: number | null) => (id === null ? null : (teams[id] ?? null));
  if (!result.ok) {
    if (result.failure === "notFound") {
      // 바로 위 화면 제목이 '한국인 메이저리거 역대 기록'이라 같은 말을 되풀이하지 않는다
      return <StateNotice emoji="🏆" title="기록을 준비하고 있어요" detail="곧 열려요." />;
    }
    return <ApiErrorNotice failure={result.failure} />;
  }
  const records: RecordsResponse = result.data;
  const offseason = home.ok && home.data.offseason != null;

  const categories = records.categories.filter((c) => c.leaders.length > 0);
  const best = records.singleSeason.filter((b) => b.rows.length > 0);
  if (categories.length === 0) {
    return <StateNotice emoji="🏆" title="아직 기록을 받지 못했어요" detail="MLB 기록을 받는 중이에요. 잠시 뒤 다시 와 주세요." />;
  }
  const stat = pick(params.stat, categories.map((c) => c.key), categories[0].key);
  const bestKey = pick(params.best, best.map((b) => b.key), best[0]?.key ?? "");
  const category = categories.find((c) => c.key === stat)!;
  const bestList = best.find((b) => b.key === bestKey);
  const people = new Set(categories.flatMap((c) => c.leaders.map((l) => l.nameKo))).size;
  const other = (param: "stat" | "best"): Record<string, string> =>
    param === "stat" ? (bestKey ? { best: bestKey } : {}) : { stat };

  // 두 묶음 제목은 기록을 주어로 쓴다. 지난 선수를 '선배'로 부르지 않는다(PRODUCT.md 말투, 11-17 사용자 결정 '추천대로')
  const nexts = nextPerPlayer(records.next);
  const nextSection = nexts.length === 0 ? null : (
    <Section key="next" title={offseason ? `${records.season + 1}년에 넘을 기록` : "다음에 넘을 기록"} aside="남은 수">
      <ul className="card divide-y divide-line overflow-hidden">
        {nexts.map((n) => (
          <NextRow key={`${n.nameKo}-${n.category}`} next={n} teamAbbr={teamOf(n.playerId)} />
        ))}
      </ul>
    </Section>
  );
  const meaningful = records.passed.filter((p) => p.passedValue >= PASSED_MIN);
  const passed = groupPassed(meaningful);
  const shownPassed = passed.length - PASSED_SHOWN >= PASSED_REST_MIN ? PASSED_SHOWN : passed.length;
  const passedSection =
    passed.length > 0 ? (
      <Section key="passed" title={`${records.season}년에 넘은 기록`} aside={`${meaningful.length}번`}>
        <ul className="card divide-y divide-line overflow-hidden">
          {passed.slice(0, shownPassed).map((g) => (
            <PassedRow key={g.key} group={g} teamAbbr={teamOf(g.first.playerId)} />
          ))}
        </ul>
        {passed.length > shownPassed && (
          <ShowMore moreLabel={`${passed.length - shownPassed}개 더 보기`}>
            <ul className="card mt-2 divide-y divide-line overflow-hidden">
              {passed.slice(shownPassed).map((g) => (
                <PassedRow key={g.key} group={g} teamAbbr={teamOf(g.first.playerId)} />
              ))}
            </ul>
          </ShowMore>
        )}
      </Section>
    ) : null;

  const rankingSection = (
    <Section key="ranking" title="통산 순위" aside={`${people}명 · MLB 정규시즌`}>
      <StatPills
        label="통산 기록 고르기"
        param="stat"
        items={categories}
        current={stat}
        other={other("stat")}
      />
      <ul className="card divide-y divide-line overflow-hidden">
        {category.leaders.slice(0, TOP).map((l) => (
          <LeaderRow key={l.nameKo} leader={l} unit={category.unit} teamAbbr={teamOf(l.playerId)} />
        ))}
      </ul>
      {category.leaders.length > TOP && (
        <ShowMore moreLabel={`${category.leaders.length - TOP}명 더 보기`}>
          <ul className="card mt-2 divide-y divide-line overflow-hidden">
            {category.leaders.slice(TOP).map((l) => (
              <LeaderRow key={l.nameKo} leader={l} unit={category.unit} teamAbbr={teamOf(l.playerId)} />
            ))}
          </ul>
        </ShowMore>
      )}
    </Section>
  );

  const bestSection = bestList ? (
    <Section key="best" title="한 시즌 최다">
      <StatPills label="한 시즌 기록 고르기" param="best" items={best} current={bestKey} other={other("best")} />
      <ul className="card divide-y divide-line overflow-hidden">
        {bestList.rows.map((r) => (
          <BestRow key={`${r.nameKo}-${r.season}`} row={r} unit={bestList.unit} />
        ))}
      </ul>
    </Section>
  ) : null;

  // 시즌 중: 다음에 넘을 기록(매일 줄어듦) → 통산 순위 → 넘은 기록 → 한 시즌. 비시즌: 이번 시즌 결산(넘은 기록)부터
  const left = offseason ? [passedSection, nextSection] : [nextSection, passedSection];
  // 앱 로딩 뼈대가 다음 실행 때 같은 순서·같은 묶음으로 그려지게 앱에 알린다(그려진 묶음만, korleaguer-app#54)
  const order = left.flatMap((section) => (section ? [section.key as RecordsOrder[number]] : []));
  return (
    <div className="space-y-4">
      <AppShape records={order} />
      <DataBanners dataMode={records.dataMode} statsAvailable />
      {/* 화면 제목이 '한국인 메이저리거 역대 기록'이라 같은 말을 되풀이하지 않는다 */}
      <p className="px-1 text-meta text-muted">{`박찬호부터 지금 선수까지 ${people}명`}</p>
      {/* PC: 왼쪽 칸에 지금 선수 이야기(넘은·넘을 기록), 오른쪽 칸에 역대 순위 */}
      <div className="space-y-7 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6 lg:space-y-0">
        <div className="space-y-7">{left}</div>
        <div className="space-y-7">
          {rankingSection}
          {bestSection}
        </div>
      </div>
    </div>
  );
}
