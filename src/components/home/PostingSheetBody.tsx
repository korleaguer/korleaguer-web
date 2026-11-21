import type { CSSProperties } from "react";
import type { PostingPlayer, PostingStatus, PostingSummary } from "@/lib/api";
import { formatDate, withAndParticle } from "@/lib/format";
import { dDayText, derivePosting, formatUsd, historyRank, isOpen, STATUS_LABEL, type Signing } from "@/lib/posting";
import { kboTeamColor } from "@/lib/teams";
import HistorySheetRow from "@/components/home/HistorySheetRow";
import LinkedTeams from "@/components/home/LinkedTeams";
import KboAvatar from "@/components/home/KboAvatar";
import { PostingDot } from "@/components/home/PostingDot";
import PostingNews from "@/components/home/PostingNews";
import { cacheLife } from "next/cache";
import MoneyUnitScope from "@/components/home/MoneyUnitScope";
import Words from "@/components/Words";

/** 창 안 관련 기사 수. 휴대폰은 11-12 사용자 결정. 나머지는 '전체 기사 보기'로 뉴스 탭에서 본다 */
const NEWS_SHOWN = 2;

/**
 * 역대 계약 순위 막대에서 2위 막대의 가장 짧은 길이(1위 막대 = 1). 막대 길이는 금액에 정비례하는데, 1위(이정후 1억 1,300만
 * 달러)가 훨씬 크면 2위부터 막대가 짧아 아래 선수끼리 차이가 안 보인다. 그래서 정비례로 2위가 이보다 짧아지면 1위 막대만 끝을
 * 끊어 꽉 채우고(실제보다 짧게 그렸다는 표시), 나머지는 2위를 이 길이로 둔 정비례로 그린다(사용자 결정 11-17 '1위만 끊긴 막대',
 * 이슈 #277). 결정 그림(노시환 6,000만 달러 가정)의 2위 막대가 1위의 약 82%였다.
 * 예전 '금액 2배 = 막대 1.5배'(11-11)는 1/4 금액이 44% 막대가 되어 작은 계약이 2~4배 커 보였다.
 */
const SECOND_SHARE = 0.82;
/** 아무리 작은 계약도 막대가 점처럼 사라지지 않게 */
const BAR_MIN_SHARE = 0.04;

/**
 * 막대 길이(0~1)와 끊어 그릴 막대. 꽉 찬 막대(1)에 해당하는 금액(unit)은 정비례면 1위 금액, 1위를 끊으면 2위 금액 / SECOND_SHARE다.
 * 1위가 여럿(같은 금액)이면 2위가 1위와 같아 끊지 않는다
 */
function barScale(amounts: number[]): { share: (amount: number) => number; cut: (amount: number) => boolean } {
  const [first = 0, second = 0] = [...amounts].sort((a, b) => b - a);
  // 1위 금액이 0이면(보장액 0만 있는 경우) 나눗셈이 NaN이 되지 않게 모두 최소 길이
  if (first <= 0) return { share: () => BAR_MIN_SHARE, cut: () => false };
  const cutting = second > 0 && second / first < SECOND_SHARE;
  const unit = cutting ? second / SECOND_SHARE : first;
  return {
    share: (amount) => Math.min(1, Math.max(BAR_MIN_SHARE, amount / unit)),
    cut: (amount) => cutting && amount > unit,
  };
}

/** 상태 알약의 뜻(DESIGN.md 신호색): 협상은 소속이 바뀌는 일이라 이적 보라, 계약은 초록, 결렬·결과 확인 중은 회색 */
type StatusTone = "fa" | "success" | "neutral";

const STATUS_TONE: Record<PostingStatus, StatusTone> = {
  UPCOMING: "fa",
  NEGOTIATING: "fa",
  SIGNED: "success",
  NO_DEAL: "neutral",
  CLOSED: "neutral",
};

/** 이름 옆 알약: 옅은 신호색 바탕 + 진한 글자 */
const PILL_TONE: Record<StatusTone, string> = {
  fa: "bg-fa-bg text-fa-fg",
  success: "bg-success-bg text-success-fg",
  neutral: "bg-neutral-pill text-neutral-pill-fg",
};

/** 휴대폰 구단 색 띠 위 흰 알약: 점과 글자만 신호색('내 선수' 무대 배지와 같다) */
const BADGE_TONE: Record<StatusTone, string> = {
  fa: "text-fa-fg",
  success: "text-success-fg",
  neutral: "text-foreground",
};

/**
 * 상태 알약 앞 7px 점. 성적표 줄의 상태·'내 선수' 무대 배지는 점이 있는데 이 카드만 없어서 같은 '상태'가 달라 보였다
 * (이슈 #277). 점은 글자색을 따르고, 회색 상태는 흐린 점이다(다른 상태 표시와 같다)
 */
function StatusDot({ tone }: { tone: StatusTone }) {
  return <span aria-hidden className={`size-[7px] shrink-0 rounded-full ${tone === "neutral" ? "bg-muted" : "bg-current"}`} />;
}
/** 그 시간대의 월·일·요일·시 */
function parts(iso: string, timeZone: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => f.find((x) => x.type === t)?.value ?? "";
  const days: Record<string, string> = { Sun: "일", Mon: "월", Tue: "화", Wed: "수", Thu: "목", Fri: "금", Sat: "토" };
  const hour = Number(get("hour")) % 24;
  const clock = `${hour < 12 ? "오전" : "오후"} ${hour % 12 === 0 ? 12 : hour % 12}시`;
  return { md: `${get("month")}월 ${get("day")}일`, weekday: days[get("weekday")] ?? "", clock };
}

/** "12월 2일(수) 오전 7시"(한국 시간) */
function deadlineKst(iso: string): string {
  const p = parts(iso, "Asia/Seoul");
  return `${p.md}(${p.weekday}) ${p.clock}`;
}

/**
 * "12월 1일(화) 오후 5시"(미국 동부). 한국 시간 줄처럼 요일을 붙인다: 날짜가 하루 다르니 요일까지 있어야
 * 한국 날짜와 견주기 쉽다(전수조사)
 */
function deadlineUs(iso: string): string {
  const p = parts(iso, "America/New_York");
  return `${p.md}(${p.weekday}) ${p.clock}`;
}

/**
 * 비시즌 홈 첫 화면 줄인 카드(MlbChallengeCompact)의 '포스팅 소식' 줄을 누르면 뜨는 아래 창(640px 이상은 가운데 창)의 본문.
 * 옛 큰 카드(MlbChallenge)는 #384에서 첫 화면 자리를 줄인 카드에 내주고 이 창 본문으로만 남았다. 창 제목이 카드 제목 자리를 맡으므로
 * 섹션 제목·카드 틀 없이 한 칸으로 그린다. 상태 계산은 줄인 카드와 같은 derivePosting을 쓴다.
 * 사용자 결정(11-12, 매일 들어오는 사람에게 같은 화면이 반복되지 않게):
 * - 한 명이면 원소속 구단 색 띠 + 띠에 걸친 사진 + 이름 + 흐린 한 줄(구단 · 포지션 · 출생 연도).
 * - 행선지로 거론된 구단(서버가 기사마다 AI로 고른 것, 최근 7일).
 * - '역대 포스팅 계약'은 올해 계약한 선수가 있을 때만 보인다(사용자 11-15, 이슈 #234). 계약한 날에는 "역대 몇 위야?"가 가장
 *   궁금해서 계약 줄 밑에 '역대 n위'를 두고, 전체 순위는 접기 줄로 둔다.
 * - 관련 기사는 2건. 더 있으면 '전체 기사 보기'로 뉴스 탭에서 본다(이슈 #206).
 * 여러 명이면 첫 화면 줄이 이미 한 사람 한 줄이라 창 안에서는 되풀이하지 않는다.
 */
export default async function PostingSheetBody({ posting }: { posting: PostingSummary }) {
  // 잠깐 재사용: 같은 데이터면 30초 동안 그려 둔 것을 다시 쓴다(쿠키와 상관없는 부품이라 모두에게 같다).
  // 운영 서버(라즈베리파이 4)는 화면 그리기가 느려서 큰 부품을 매번 그리지 않는다.
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  if (posting.players.length === 0) return null;
  const { single, signings, signedNow, rankOf, news } = derivePosting(posting);
  const singleRank = single ? rankOf(single.nameKo) : null;
  // '전체 기사 보기': 한 명이면 그 선수로 거른 뉴스 탭, 여러 명이면 전체
  const newsPlayer = single?.nameKo ?? null;
  return (
    <div className="pb-4">
      {single && <HeadBand player={single} />}
      <div className="min-w-0">
        {single && <PlayerHead player={single} />}
        {singleRank != null && <RankLine rank={singleRank} total={signings.length} />}
        {single && isOpen(single) && single.linkedTeams && (
          <LinkedTeams
            counts={single.linkedTeams}
            sheetKey={`posting-${single.nameKo}`}
            className="mt-5"
            pcBars={false}
            playerPhotoUrl={single.photoUrl}
          />
        )}
        {signedNow && (
          <div>
            <HistorySheetRow
              title={`역대 포스팅 계약 ${signings.length}건`}
              hint={<Words text={`1위 ${signings[0].nameKo} ${signings[0].years}년 ${signings[0].usd} · 보장액 순`} />}
            >
              <SigningList signings={signings} />
            </HistorySheetRow>
          </div>
        )}
        <div>
          <PostingNews items={news} shown={NEWS_SHOWN} player={newsPlayer} heading={single ? "h4" : "h3"} />
        </div>
      </div>
    </div>
  );
}

/** 카드 맨 위 원소속 KBO 구단 색 띠(선수가 한 명일 때). PC에서도 카드 전체 폭을 가로지른다(두 칸 위) */
function HeadBand({ player: p }: { player: PostingPlayer }) {
  const tone = STATUS_TONE[p.status] ?? "neutral";
  return (
    <div
      className="posting-band h-[4.5rem] rounded-xl"
      style={{ "--team": kboTeamColor(p.kboTeam) } as CSSProperties}
    >
      {/* 휴대폰만. PC는 띠가 넓어 알약이 이름에서 멀리 떨어지므로 이름 옆에 둔다(PlayerHead) */}
      {/* 화면 읽기는 이름 다음의 알약이 맡는다(이름보다 먼저 읽히지 않게).
          글자색은 상태를 따른다(예전에는 늘 보라라 계약한 날에도 '계약'이 보라였다) */}
      <span
        aria-hidden
        className={`absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-0.5 text-badge shadow-[var(--shadow-card)] lg:hidden ${BADGE_TONE[tone]}`}
      >
        <StatusDot tone={tone} />
        {STATUS_LABEL[p.status] ?? STATUS_LABEL.CLOSED}
      </span>
    </div>
  );
}

/** 포스팅 선수가 한 명일 때: 띠에 걸친 사진 · 이름 · 흐린 한 줄 · 남은 날과 마감 시각(또는 계약·결렬) */
function PlayerHead({ player: p }: { player: PostingPlayer }) {
  const tone = STATUS_TONE[p.status] ?? "neutral";
  // 위계상 이름 다음 곁다리 정보라 알약에 담지 않고 흐린 한 줄로 둔다(사용자 11-12 '띠 한 줄')
  const sub = [p.kboTeam, p.positionKo, p.birthYear ? `${p.birthYear}년생` : null].filter(Boolean).join(" · ");
  return (
    <>
      <div className="-mt-9 flex items-start gap-3">
        <span className="relative z-10 shrink-0 rounded-full ring-4 ring-surface">
          {/* 비시즌 홈 첫 화면 사진이라 바로 받고(eager), 첫 화면에서 가장 큰 사진이라 다른 사진보다 먼저 받는다(high) */}
          <KboAvatar nameKo={p.nameKo} photoUrl={p.photoUrl} size={76} eager fetchPriority="high" />
        </span>
        {/* 이름·한 줄은 띠 아래에서 시작한다(띠에 걸친 사진 높이 36px + 여백) */}
        <div className="min-w-0 pt-[2.75rem]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-display">{p.nameKo}</h3>
            {/* 휴대폰은 화면 읽기에만(눈에는 띠 위 알약). 'sr-only lg:not-sr-only'로 쓰면 not-sr-only가 여백을 0으로 되돌려
                PC 알약이 글자에 붙어 보였다(운영 1280px 실측 padding 0). 그래서 1024px 미만에만 sr-only를 건다 */}
            <span
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-badge max-lg:sr-only ${PILL_TONE[tone]}`}
            >
              <StatusDot tone={tone} />
              {STATUS_LABEL[p.status] ?? STATUS_LABEL.CLOSED}
            </span>
          </div>
          <p className="mt-0.5 text-meta text-muted">{sub}</p>
        </div>
      </div>

      {isOpen(p) && p.daysLeft != null && (
        // 남은 날('D-15')은 줄이지 않는다. 마감 시각과 반씩 줄어들어 360px 휴대폰(보통 크기)에서도 'D-'/'15'로 갈렸다.
        // 줄이 15.5rem보다 좁으면(큰 글씨) 마감 시각을 아래 줄로 내리고 왼쪽에 맞춘다(이슈 #264).
        // 15.5rem: 'D-15' 칸 6.5rem + 간격 + 마감 날짜 한 줄 7.5rem(11-17 측정). 보통 크기는 320px 휴대폰(16.5rem)도 나란히 둔다
        <div className="@container mt-4">
          <div className="flex items-end justify-between gap-3 @max-[15.5rem]:flex-col @max-[15.5rem]:items-start">
            <div className="shrink-0">
              <p className="text-caption text-muted">협상 마감까지</p>
              <p className="text-stat-form tabular-nums">
                {/* 'D-19'는 화면 낭독기가 'D 하이픈 19'로 읽을 수 있어 '19일 남음'을 따로 읽힌다 */}
                <span aria-hidden>{dDayText(p.daysLeft)}</span>
                <span className="sr-only">{p.daysLeft === 0 ? "오늘 마감" : `${p.daysLeft}일 남음`}</span>
              </p>
            </div>
            <p className="text-right text-label tabular-nums @max-[15.5rem]:text-left">
              {deadlineKst(p.deadlineAt)}
              <span className="block text-caption text-muted">
                <span aria-hidden>미국 {deadlineUs(p.deadlineAt)}</span>
                <span className="sr-only">미국 동부 {deadlineUs(p.deadlineAt)}</span>
              </span>
            </p>
          </div>
        </div>
      )}

      {p.deal && p.deal.years != null && p.deal.guaranteedUsd != null && (
        <p className="mt-4 text-summary">
          {/* 받침 있는 구단(보스턴·시애틀)은 '과'(점검 11-13) */}
          {p.deal.mlbTeamKo ? `${withAndParticle(p.deal.mlbTeamKo)} ` : ""}
          <Words text={`${p.deal.years}년 ${formatUsd(p.deal.guaranteedUsd)}`} />
          {p.deal.agreedOn && (
            <span className="block text-caption text-muted">합의 {formatDate(p.deal.agreedOn)}, 미국 날짜</span>
          )}
        </p>
      )}
      {p.status === "NO_DEAL" && <p className="mt-4 text-body text-muted">계약하지 못해 {p.kboTeam}에 남아요.</p>}
    </>
  );
}

/**
 * 계약한 날 계약 줄 밑: '역대 n위' 알약 + 몇 건 중인지(사용자 11-15 시안 A). 순위는 보장액 순(옵션 제외)이고,
 * 같은 금액이면 공동 순위다. 전체 순위는 아래 접기 줄에서 본다.
 */
function RankLine({ rank, total }: { rank: number; total: number }) {
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-badge text-success-fg tabular-nums">
        역대 {rank}위
      </span>
      <span className="text-caption text-muted tabular-nums">포스팅 계약 {total}건 중</span>
    </p>
  );
}

/**
 * '역대 포스팅 계약' 보장액 순위: 순위 · 얼굴 · 이름 · 연도·구단 · 마감 며칠 전 / 잉크 막대 + 금액(달러↔원화).
 * 올해 계약한 선수가 있을 때만 그리므로 줄 앞 순위 숫자로 그 선수가 몇 위인지 바로 보이게 한다(올해 선수는 강조색).
 * 막대는 위 '지금' 진행 막대와 헷갈리지 않게 바탕 줄 없이, 왼쪽이 거의 투명하고 금액 쪽으로 진해지는 글자색 막대다
 * (`.ink-bar`). 파랑·신호색·팀 색을 쓰지 않는다(The One Blue Rule, 어두운 화면에서 갈색·남색 팀 색이 묻힘).
 * 길이는 금액에 정비례하고, 1위가 훨씬 크면 1위만 끝을 끊어 그린다(barScale, `.ink-bar-cut`).
 */
function SigningList({ signings }: { signings: Signing[] }) {
  const scale = barScale(signings.map((s) => s.amount));
  const list = (
      <ul className="money-flip-pause divide-y divide-line">
        {signings.map((s) => {
          const share = scale.share(s.amount);
          return (
            <li key={s.key} className="flex items-center gap-3 py-2.5">
              {/* 두 자리(10위)도 한 줄에 들어가는 폭 */}
              <span
                className={`w-5 shrink-0 text-right text-label tabular-nums ${s.thisYear ? "text-accent-ink" : "text-muted"}`}
              >
                {historyRank(signings, s.amount)}
                <span className="sr-only">위</span>
              </span>
              <PostingDot nameKo={s.nameKo} photoUrl={s.photoUrl} size={30} />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-1.5">
                  <span className="shrink-0 text-summary">{s.nameKo}</span>
                  {s.thisYear && (
                    <span className="shrink-0 self-center rounded-full bg-success-bg px-1.5 py-0.5 text-badge text-success-fg">
                      올해
                    </span>
                  )}
                  <span className="truncate text-caption text-muted tabular-nums">
                    {s.season}
                    {s.teamKo ? ` · ${s.teamKo}` : ""}
                  </span>
                  <span className="ml-auto shrink-0 text-caption text-muted tabular-nums">
                    {/* '마감 22일 전'은 위 'D-20'(남은 날)과 같은 축으로 읽혀서, 계약 시점임을 문장으로 쓴다(11-12 PC 평가) */}
                    {s.days === 0 ? "마감 당일 계약" : `${s.days}일 남기고 계약`}
                  </span>
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  {/* 끊긴 막대도 금액은 옆 글자와 화면 낭독기가 그대로 읽는다 */}
                  <i
                    aria-hidden
                    className={scale.cut(s.amount) ? "ink-bar ink-bar-cut" : "ink-bar"}
                    style={{ "--share": share.toFixed(4) } as CSSProperties}
                  />
                  <span className="text-label tabular-nums">
                    <DealMoney years={s.years} usd={s.usd} krw={s.krw} />
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
  );
  return (
    <div>
      {/* 원화가 있으면 번갈아 보이기를 멈추는 '달러·원화' 고르기를 목록 위에 둔다(이슈 #263). 바로 위가 줄 버튼이라
          버튼(높이 20px)의 44px 누름 영역이 그 버튼 아래쪽을 덮지 않게 12px 띄운다(리뷰 지적).
          환율이 없는 계약은 원화를 골라도 달러로 남는다(번갈아 보이지도 않는다) */}
      {signings.some((s) => s.krw) ? <MoneyUnitScope className="pt-3">{list}</MoneyUnitScope> : list}
      <p className="mt-1.5 pb-1 text-micro text-muted">
        보장액(옵션 제외) · 원화는 계약 당시 환율 · 출처 MLB Trade Rumors 등
      </p>
    </div>
  );
}

/**
 * 계약 금액: 달러와 원화(합의일 환율 어림)를 4초마다 번갈아 보인다(사용자 요청 11-11, globals.css .money-flip).
 * 목록 위 '달러·원화'(MoneyUnitScope)를 누르면 그 금액으로 멈춘다(WCAG 2.2.2, 이슈 #263).
 * 두 값을 한 칸에 겹쳐 두어 바뀌어도 줄이 흔들리지 않는다. 연수("6년")도 함께 바꿔야 둘 다 오른쪽 끝에 붙는다
 * (연수를 칸 밖에 두면 짧은 원화일 때 연수와 금액 사이가 벌어진다). 화면 읽기 프로그램에는 두 값을 한 번에 읽힌다.
 * 모든 줄이 한꺼번에 바뀐다. 목록에 마우스를 올리면 멈춘다(.money-flip-pause).
 */
function DealMoney({ years, usd, krw }: { years: number; usd: string; krw: string | null }) {
  if (!krw) return <Words text={`${years}년 ${usd}`} />;
  return (
    <>
      <span className="sr-only">{`${years}년 ${usd}, 원화로 ${krw}`}</span>
      <span aria-hidden className="money-flip money-flip-start">
        <span>
          <Words text={`${years}년 ${usd}`} />
        </span>
        <span>
          <Words text={`${years}년 ${krw}`} />
        </span>
      </span>
    </>
  );
}
