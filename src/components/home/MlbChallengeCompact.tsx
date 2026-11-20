import type { PostingPlayer, PostingSummary } from "@/lib/api";
import Section from "@/components/Section";
import Words from "@/components/Words";
import HistorySheetRow from "@/components/home/HistorySheetRow";
import KboAvatar from "@/components/home/KboAvatar";
import MlbChallenge, { formatUsd, historyRank, newsOf, pastSignings, isOpen, rank, thisYearSignings } from "@/components/home/MlbChallenge";
import PostingNews from "@/components/home/PostingNews";

/** 첫 화면 줄 오른쪽에 두는 기사 수(PC 오른쪽 칸). 휴대폰은 창 안에서 본다 */
const NEWS_SHOWN = 2;

const DAY = "Asia/Seoul";
const kstMonthDay = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", { timeZone: DAY, month: "long", day: "numeric" }).format(new Date(iso));

const TONE: Record<string, { label: string; text: string; dot: string }> = {
  UPCOMING: { label: "협상 시작 전", text: "text-fa-fg", dot: "bg-fa-fg" },
  NEGOTIATING: { label: "협상 중", text: "text-fa-fg", dot: "bg-fa-fg" },
  SIGNED: { label: "계약", text: "text-success-fg", dot: "bg-success-fg" },
  NO_DEAL: { label: "결렬", text: "text-foreground", dot: "bg-muted" },
  CLOSED: { label: "결과 확인 중", text: "text-foreground", dot: "bg-muted" },
};

/**
 * 비시즌 홈 맨 위 '이번 겨울 MLB 도전'의 첫 화면 모양(사용자 11-21 아침 시안 3안).
 * 휴대폰 첫 화면이 한 선수의 큰 카드로 다 차 우리 선수 성적표가 둘째 화면으로 밀렸다(UX-DIRECTION §1·§3).
 * 그래서 선수마다 한 줄(사진 · 이름 · 상태 · 남은 날 또는 계약 금액)과 '포스팅 소식 · 거론 구단 · 기사' 줄만 두고,
 * 줄을 누르면 아래 창(640px 이상은 가운데 창)에 기존 카드 본문(MlbChallenge inSheet)을 보인다.
 * PC는 매일 바뀌는 기사 두 건을 오른쪽에 그대로 둔다. 포스팅 선수가 없으면 그리지 않는다(성적표가 맨 위).
 */
export default function MlbChallengeCompact({ posting, asOf }: { posting: PostingSummary; asOf?: string }) {
  if (posting.players.length === 0) return null;
  const players = [...posting.players].sort((a, b) => rank(a) - rank(b) || (a.daysLeft ?? 99) - (b.daysLeft ?? 99));
  const multi = players.length > 1;
  const news = newsOf(players);
  const single = players.length === 1 ? players[0] : null;
  // 거론 구단은 창 본문이 보여 주는 경우(한 명이고 협상 중·시작 전)에만 줄에 쓴다. 안 그러면 줄에는 있는데 창에서 볼 길이 없다
  const teams =
    single && isOpen(single) ? (single.linkedTeams?.teams.filter((t) => t.linked > 0) ?? []).sort((a, b) => b.linked - a.linked) : [];
  const signings = [...thisYearSignings(players), ...pastSignings(posting.history)].sort(
    (a, b) => b.amount - a.amount || b.season - a.season,
  );
  const signedNow = signings.some((s) => s.thisYear);
  const rankOf = (nameKo: string) => {
    const s = signings.find((x) => x.thisYear && x.nameKo === nameKo);
    return s ? historyRank(signings, s.amount) : null;
  };
  // 줄 둘째 줄: 이름은 위 줄에 있어 다시 쓰지 않는다. PC는 기사 제목이 오른쪽에 있어 건수를 빼고, 휴대폰만 건수를 쓴다
  const lead = [
    teams[0] ? `거론 ${teams[0].nameKo} ${teams[0].linked}건${teams.length > 1 ? ` 외 ${teams.length - 1}곳` : ""}` : null,
    signedNow ? (teams[0] ? "역대 계약 순위" : "역대 포스팅 계약 순위") : null,
  ].filter(Boolean);
  const hint = (
    <>
      <Words text={lead.length > 0 ? lead.join(" · ") : "마감 시각"} />
      {news.length > 0 && (
        <span className="lg:hidden">
          {" · "}기사 {news.length}건
        </span>
      )}
    </>
  );
  return (
    <Section id="mlb-challenge-title" title="이번 겨울 MLB 도전" aside={asOf}>
      <div className="card px-4 lg:grid lg:grid-cols-2 lg:items-center lg:gap-x-8 lg:px-5">
        <div className="min-w-0">
          <ul className="divide-y divide-line">
            {players.map((p, i) => (
              <PlayerLine key={p.nameKo} player={p} first={i === 0} place={rankOf(p.nameKo)} total={signings.length} />
            ))}
          </ul>
          {/* 창 본문이 비는 경우(여러 명인데 기사도 계약도 없음)에는 줄도 두지 않는다 */}
          {(single || news.length > 0 || signedNow) && (
          <HistorySheetRow
            title="포스팅 소식"
            sheetTitle={multi ? "포스팅 소식" : `${players[0].nameKo} 포스팅 소식`}
            stateKey="korleaguerPostingSheet"
            hint={hint}
            className="border-t border-line"
          >
            <MlbChallenge posting={posting} inSheet />
          </HistorySheetRow>
          )}
        </div>
        {/* PC: 매일 바뀌는 기사만 오른쪽에 둔다(휴대폰은 창 안) */}
        {news.length > 0 && (
          <div className="hidden lg:block lg:py-3">
            <PostingNews items={news} shown={NEWS_SHOWN} player={multi ? null : players[0].nameKo} heading={multi ? "h3" : "h4"} flush />
          </div>
        )}
      </div>
    </Section>
  );
}

/** 선수 한 줄: 사진 · 이름 + 상태 · 구단·포지션(계약이면 '원소속 → 새 구단') | 남은 날과 마감일(계약이면 금액과 역대 순위) */
function PlayerLine({ player: p, place, total, first }: { player: PostingPlayer; place: number | null; total: number; first: boolean }) {
  const tone = TONE[p.status] ?? TONE.CLOSED;
  const deal = p.deal && p.deal.years != null && p.deal.guaranteedUsd != null ? p.deal : null;
  return (
    <li className="flex items-center gap-3 py-3">
      <KboAvatar nameKo={p.nameKo} photoUrl={p.photoUrl} size={44} eager fetchPriority={first ? "high" : undefined} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <h3 className="whitespace-nowrap text-heading">{p.nameKo}</h3>
          <span className={`text-label ${tone.text}`}>
            <span aria-hidden className={`mr-1 inline-block size-[7px] rounded-full align-middle ${tone.dot}`} />
            {tone.label}
          </span>
        </div>
        <p className="mt-0.5 truncate text-caption text-muted">
          {p.status === "SIGNED" && deal?.mlbTeamKo ? `${p.kboTeam} → ${deal.mlbTeamKo}` : `${p.kboTeam} · ${p.positionKo}`}
        </p>
      </div>
      {p.status === "NEGOTIATING" && p.daysLeft == null ? (
        <p className="shrink-0 text-right text-micro text-muted tabular-nums">{kstMonthDay(p.deadlineAt)} 마감</p>
      ) : p.status === "NEGOTIATING" && p.daysLeft != null ? (
        <div className="shrink-0 text-right">
          <p className="text-stat leading-none tabular-nums">
            <span aria-hidden>{p.daysLeft === 0 ? "오늘" : `D-${p.daysLeft}`}</span>
            <span className="sr-only">{p.daysLeft === 0 ? "오늘 마감" : `마감까지 ${p.daysLeft}일`}</span>
          </p>
          <p className="mt-1 text-micro text-muted tabular-nums">{kstMonthDay(p.deadlineAt)} 마감</p>
        </div>
      ) : p.status === "UPCOMING" ? (
        <p className="shrink-0 text-right text-micro text-muted tabular-nums">{kstMonthDay(p.windowOpensAt)} 시작</p>
      ) : p.status === "SIGNED" && deal ? (
        <div className="shrink-0 text-right">
          <p className="text-label tabular-nums">
            <Words text={`${deal.years}년 ${formatUsd(deal.guaranteedUsd!)}`} />
          </p>
          {place != null && (
            <p className="mt-0.5 text-micro text-success-fg tabular-nums">
              역대 {place}위 <span className="text-muted">/ {total}건</span>
            </p>
          )}
        </div>
      ) : null}
    </li>
  );
}
