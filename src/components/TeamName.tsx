import { teamColor, teamLogoUrl, teamLogoUrlById } from "@/lib/teams";
import TeamMark, { type TeamMarkSize } from "./TeamMark";

/**
 * 팀 로고(없으면 팀 색 점) + 한글 팀 이름. 내 팀·상대 팀 모두 쓴다. 팀을 모르면 "-".
 * prefix는 이름 앞말(FA·국내 복귀 선수의 마지막 MLB 팀이면 "전": '전 애틀랜타').
 * teamId는 약어가 없는 팀(마이너 팀)의 로고를 팀 번호로 찾을 때 쓴다.
 */
export default function TeamName({
  teamKo,
  teamAbbr,
  size = "sm",
  prefix,
  teamId,
}: {
  teamKo: string | null;
  teamAbbr: string | null;
  size?: TeamMarkSize;
  prefix?: string;
  teamId?: number | null;
}) {
  if (!teamKo) return <span>-</span>;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <TeamMark logoUrl={teamAbbr ? teamLogoUrl(teamAbbr) : teamLogoUrlById(teamId)} color={teamColor(teamAbbr)} size={size} />
      {prefix ? `${prefix} ${teamKo}` : teamKo}
    </span>
  );
}
