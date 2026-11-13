import type { LinkedTeams as LinkedTeamCounts } from "@/lib/api";
import { withTopicParticle } from "@/lib/format";
import TeamMark from "@/components/TeamMark";
import { teamColor, teamLogoUrl } from "@/lib/teams";

/** 거론 구단 알약을 몇 개까지 보이나(나머지는 '외 n개 구단') */
const LINKED_SHOWN = 3;
/** 반대 전망 한 줄: 한 구단의 반대 전망이 이보다 많고 거론의 절반 이상일 때만 */
const DOUBT_MIN = 3;

/**
 * '행선지로 거론된 구단'(사용자 11-12 결정). 서버가 기사마다 AI로 고른 최근 며칠 거론을 센다.
 * 기획 판단(11-12): 알약의 숫자는 '이 선수의 행선지로 거론한 기사'만 센다. 반대 전망을 같은 칸에 숫자로 섞으면
 * "그래서 어디 간다는 거지?"가 된다. 다만 숫자를 꾸미지 않도록, 한 구단의 반대 전망이 DOUBT_MIN건 넘고 거론의 절반
 * 이상이면 아래 한 줄로만 알린다. 반대 기사도 아래 '관련 기사'에는 그대로 나온다. 거론된 구단이 없으면 칸을 그리지 않는다.
 * MLB 도전 카드(포스팅 선수)와 시즌 성적표의 FA 선수(이슈 #191)가 함께 쓴다.
 */
export default function LinkedTeams({ counts, className }: { counts: LinkedTeamCounts; className?: string }) {
  const linked = counts.teams.filter((t) => t.linked > 0);
  if (linked.length === 0) return null;
  const shown = linked.slice(0, LINKED_SHOWN);
  const more = linked.length - shown.length;
  const doubt = [...counts.teams]
    .filter((t) => t.doubted > DOUBT_MIN && t.doubted * 2 >= t.linked)
    .sort((a, b) => b.doubted - a.doubted)[0];
  return (
    <div className={className}>
      <p className="mb-2 flex items-baseline justify-between gap-2 text-[0.8125rem] font-bold">
        <span>행선지로 거론된 구단</span>
        <span className="shrink-0 text-[0.6875rem] font-normal text-muted tabular-nums">
          최근 {counts.days}일 기사 수
        </span>
      </p>
      <ul className="flex flex-wrap items-center gap-1.5">
        {shown.map((t) => (
          <li
            key={t.abbreviation}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pl-1.5 pr-3 text-[0.8125rem] font-semibold"
          >
            <TeamMark logoUrl={teamLogoUrl(t.abbreviation)} color={teamColor(t.abbreviation)} size="sm" />
            {t.nameKo}
            <span className="font-bold tabular-nums">{t.linked}건</span>
            {t.today && <span className="text-xs font-bold text-accent-ink">오늘 새 기사</span>}
          </li>
        ))}
        {more > 0 && <li className="px-1 text-xs text-muted tabular-nums">외 {more}개 구단</li>}
      </ul>
      {doubt && (
        <p className="mt-2 text-xs text-muted tabular-nums">
          {withTopicParticle(doubt.nameKo)} &apos;필요 없다&apos;는 전망도 {doubt.doubted}건 있었어요
        </p>
      )}
    </div>
  );
}
