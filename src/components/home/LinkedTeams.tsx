import type { CSSProperties } from "react";
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
 * pcBars면 PC(lg)에서는 알약 대신 한 구단 한 줄 막대로 보인다(MLB 도전 카드, 사용자 11-16: PC 왼쪽 칸이 비어 보인다).
 * 같은 정보를 세로로 펼쳐 구단끼리 차이가 한눈에 보이게 하고, 그만큼 왼쪽 칸 높이가 오른쪽 기사 칸과 맞는다.
 */
export default function LinkedTeams({
  counts,
  className,
  pcBars = false,
}: {
  counts: LinkedTeamCounts;
  className?: string;
  /** PC(lg)에서 알약 대신 막대(휴대폰은 알약 그대로) */
  pcBars?: boolean;
}) {
  const linked = counts.teams.filter((t) => t.linked > 0);
  if (linked.length === 0) return null;
  const shown = linked.slice(0, LINKED_SHOWN);
  const more = linked.length - shown.length;
  const doubt = [...counts.teams]
    .filter((t) => t.doubted > DOUBT_MIN && t.doubted * 2 >= t.linked)
    .sort((a, b) => b.doubted - a.doubted)[0];
  // 막대 길이 기준: 보이는 구단 중 가장 많은 기사 수(서버가 많은 순으로 준다)
  const top = Math.max(...shown.map((t) => t.linked));
  return (
    <div className={className}>
      <p className="mb-2 flex items-baseline justify-between gap-2 text-label">
        <span>행선지로 거론된 구단</span>
        <span className="shrink-0 text-caption text-muted tabular-nums">
          최근 {counts.days}일 기사 수
        </span>
      </p>
      {pcBars && (
        <ul className="hidden space-y-2.5 lg:block">
          {shown.map((t) => (
            <li key={t.abbreviation} className="flex items-center gap-2.5 text-label">
              <TeamMark logoUrl={teamLogoUrl(t.abbreviation)} color={teamColor(t.abbreviation)} size="sm" />
              <span className="w-24 shrink-0 truncate">{t.nameKo}</span>
              <span className="flex min-w-0 flex-1 items-center gap-2">
                {/* 역대 계약 순위와 같은 잉크 막대(팀 색·파랑을 쓰지 않는다). 막대 뒤 글자 자리 140px를 남긴다 */}
                <i
                  aria-hidden
                  className="ink-bar"
                  style={{ "--share": Math.max(0.04, t.linked / top).toFixed(4) } as CSSProperties}
                />
                <span className="shrink-0 font-bold tabular-nums">{t.linked}건</span>
                {t.today && <span className="shrink-0 text-caption font-bold text-accent-ink">오늘 새 기사</span>}
              </span>
            </li>
          ))}
          {more > 0 && <li className="pl-7 text-caption text-muted tabular-nums">외 {more}개 구단</li>}
        </ul>
      )}
      <ul className={`flex flex-wrap items-center gap-1.5 ${pcBars ? "lg:hidden" : ""}`}>
        {shown.map((t) => (
          <li
            key={t.abbreviation}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pl-1.5 pr-3 text-label"
          >
            <TeamMark logoUrl={teamLogoUrl(t.abbreviation)} color={teamColor(t.abbreviation)} size="sm" />
            {t.nameKo}
            <span className="font-bold tabular-nums">{t.linked}건</span>
            {t.today && <span className="text-caption font-bold text-accent-ink">오늘 새 기사</span>}
          </li>
        ))}
        {more > 0 && <li className="px-1 text-caption text-muted tabular-nums">외 {more}개 구단</li>}
      </ul>
      {doubt && (
        <p className="mt-2 text-caption text-muted tabular-nums">
          {withTopicParticle(doubt.nameKo)} &apos;필요 없다&apos;는 전망도 {doubt.doubted}건 있었어요
        </p>
      )}
    </div>
  );
}
