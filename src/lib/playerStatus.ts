// 선수 단계·상태 이름표. 내 선수 카드, 홈 층·성적표가 같은 말을 쓴다.
import type { CardStatus } from "@/lib/api";

/** 마이너 단계 약어 → 화면 이름. 모르면 "마이너" */
const LEVEL_KO: Record<string, string> = {
  AAA: "트리플A",
  AA: "더블A",
  "A+": "하이싱글A",
  A: "싱글A",
  ROK: "루키",
};

export function levelKo(level: string | null | undefined): string {
  if (level === "MLB") return "메이저";
  return (level && LEVEL_KO[level]) || "마이너";
}

/** 배지 색: 위기 빨간 점(글자는 본문색) · 복귀 초록 · 콜업 파랑 · 이적 보라 · 그 밖 회색(DESIGN.md 신호색) */
export type BadgeTone = "danger" | "success" | "accent" | "fa" | "neutral";

export function statusBadge(status: CardStatus): { text: string; tone: BadgeTone } | null {
  const days = status.days != null ? ` ${status.days}일째` : "";
  switch (status.kind) {
    case "IL":
      return { text: `부상자 명단${days}`, tone: "danger" };
    case "RETURNED":
      return { text: `부상 복귀${days}`, tone: "success" };
    case "CALLED_UP":
      return { text: `콜업${days}`, tone: "accent" };
    case "MINORS":
      return { text: status.level ? `마이너 · ${levelKo(status.level)}` : "마이너", tone: "neutral" };
    case "MINORS_IL":
      return { text: "마이너 부상자 명단", tone: "danger" };
    case "SUSPENDED":
      return { text: `출장 정지${days}`, tone: "danger" };
    case "DFA":
      return { text: `지명 할당(DFA)${days}`, tone: "danger" };
    case "FA":
      return { text: `FA${days}`, tone: "fa" };
    case "SEASON_OVER":
      return { text: "시즌 끝", tone: "neutral" };
    case "KBO":
      return { text: `${status.teamName ?? "KBO"} 복귀`, tone: "neutral" };
    default:
      return null;
  }
}
