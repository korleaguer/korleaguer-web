import TeamName from "@/components/TeamName";
import LevelPill from "./LevelPill";

/** 여러 마이너 단계를 더한 줄의 단계 이름(서버 levelKo, DESIGN.md '숫자에는 어느 리그 기록인지') */
const MIXED_LEVELS = "마이너";

/**
 * 마이너 기록 줄의 팀 칸(이슈 #88). 마이너 팀 이름은 영어로 길어서(Oklahoma City Comets) 휴대폰에서는
 * 팀 칸을 넓혀 같은 표의 메이저 줄 숫자까지 화면 밖으로 민다. 그래서 휴대폰에서는 단계 알약만, 넓은 화면에서는 팀 이름 + 단계.
 * 여러 단계를 더한 줄(단계 이름 '마이너')은 이름 칸이 이미 '마이너'라 알약 '마이너'가 같은 말을 되풀이했다
 * (운영 'Gwinnett Stripers 마이너', 휴대폰 '마이너 | 마이너', 전수조사 L294). 그 줄은 넓은 화면에서 알약 없이 팀 이름만,
 * 휴대폰에서는 팀 이름 대신 알약 '여러 단계'를 둔다(다른 마이너 줄과 같은 자리·모양으로 단계를 말한다)
 */
export default function MinorTeam({ teamKo, level }: { teamKo: string | null; level: string }) {
  const mixed = level === MIXED_LEVELS;
  return (
    <span className="inline-flex items-center whitespace-nowrap">
      <span className="hidden sm:inline-flex">
        <TeamName teamKo={teamKo} teamAbbr={null} />
      </span>
      {mixed ? (
        <LevelPill level="여러 단계" className="sm:hidden" />
      ) : (
        <LevelPill level={level} className="sm:ml-1.5" />
      )}
    </span>
  );
}
