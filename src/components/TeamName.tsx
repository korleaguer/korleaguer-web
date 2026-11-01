import { teamColor, teamLogoUrl } from "@/lib/teams";
import TeamMark, { type TeamMarkSize } from "./TeamMark";

/** 팀 로고(없으면 팀 색 점) + 한글 팀 이름. 내 팀·상대 팀 모두 쓴다. 팀을 모르면 "-" */
export default function TeamName({
  teamKo,
  teamAbbr,
  size = "sm",
}: {
  teamKo: string | null;
  teamAbbr: string | null;
  size?: TeamMarkSize;
}) {
  if (!teamKo) return <span>-</span>;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <TeamMark logoUrl={teamLogoUrl(teamAbbr)} color={teamColor(teamAbbr)} size={size} />
      {teamKo}
    </span>
  );
}
