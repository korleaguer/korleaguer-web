import type { GameLine } from "@/lib/api";
import { isPostseason } from "@/lib/gameLog";

/**
 * 포스트시즌 경기면 경기 정보 줄 위에 두는 '포스트시즌' 한 줄(본문 글자, 알약 아님. 11-17 전수조사 L350).
 * 경기 한 줄(GameRow), 경기 상세 창, 홈 최근 경기, 내 선수 막대가 같은 모양으로 쓴다(PR #308 리뷰). 경기 정보 줄 맨 앞에
 * 넣으면 375px에서 줄이 넘쳐 결과 알약만 다음 줄로 밀렸다. 포스트시즌이 아니면 그리지 않는다
 */
export default function PostseasonLine({ game }: { game: GameLine }) {
  return isPostseason(game) ? <p className="text-meta font-semibold text-foreground">포스트시즌</p> : null;
}
