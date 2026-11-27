// 거론 구단 기사 창의 주소 기록 표시. 창(LinkedTeams)이 쓰고, 성적표 목록 틀(SeasonReportRows)이 그 창이 열려 있는지 본다.

/** 기사 창을 열며 쌓은 주소 기록 표시(history.state의 키). 값은 '<sheetKey>:<구단 약어>' */
export const SHEET_STATE = "korleaguerTeamSheet";

/** 주소 기록 표시가 이 칸(sheetKey)의 것이면 그 구단 약어 */
export function teamInHistory(state: unknown, sheetKey: string): string | null {
  const mark = (state as Record<string, unknown> | null)?.[SHEET_STATE];
  const prefix = `${sheetKey}:`;
  return typeof mark === "string" && mark.startsWith(prefix) ? mark.slice(prefix.length) : null;
}

/**
 * 이 칸(sheetKey)의 기사 창이 지금 주소 기록에서 열려 있나. 홈 성적표 목록이 창이 든 줄을 펼쳐 두려고 쓴다:
 * 기사를 보고 뒤로 오거나 새로 고쳐 창이 다시 열릴 때 그 줄이 접혀 있으면 창을 닫은 뒤 포커스를 돌려줄 알약이 숨어 있다
 */
export function linkedSheetOpen(sheetKey: string): boolean {
  return teamInHistory(window.history.state, sheetKey) !== null;
}
