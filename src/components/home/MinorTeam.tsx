import TeamName from "@/components/TeamName";
import LevelPill from "./LevelPill";

/**
 * 마이너 기록 줄의 팀 칸(이슈 #88). 마이너 팀 이름은 영어로 길어서(Oklahoma City Comets) 휴대폰에서는
 * 팀 칸을 넓혀 같은 표의 메이저 줄 숫자까지 화면 밖으로 민다. 그래서 휴대폰에서는 단계 알약만, 넓은 화면에서는 팀 이름 + 단계.
 */
export default function MinorTeam({ teamKo, level }: { teamKo: string | null; level: string }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap">
      <span className="hidden sm:inline-flex">
        <TeamName teamKo={teamKo} teamAbbr={null} />
      </span>
      <LevelPill level={level} className="sm:ml-1.5" />
    </span>
  );
}
