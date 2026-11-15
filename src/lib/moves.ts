// 이동 기록(콜업·강등·부상자 명단 등) 알약 색. 선수 페이지 이동 기록 칸(RosterMoves)과 경기 달력 아래 그달 이동 줄(GameCalendar)이 같이 쓴다.
import type { RosterMove } from "./api";

const TONE = {
  danger: "bg-danger-bg text-danger-fg",
  success: "bg-success-bg text-success-fg",
  fa: "bg-fa-bg text-fa-fg",
  majors: "bg-accent-soft text-accent-ink",
  minors: "bg-neutral-pill text-neutral-pill-fg",
  other: "bg-surface-2 text-neutral-pill-fg",
} as const;

/**
 * 이동 종류(MLB 코드)별 색. 이름은 서버(MoveLabels)가 붙인다.
 * DES 지명 할당 · REL 방출 → 위기, SFA·SGN 계약 → 새 출발, DFA(FA 선언) · TR 트레이드 · CLW 웨이버 클레임 → 소속이 바뀜
 */
const TONE_BY_CODE: Record<string, keyof typeof TONE> = {
  DES: "danger",
  REL: "danger",
  SFA: "success",
  SGN: "success",
  DFA: "fa",
  TR: "fa",
  CLW: "fa",
};

/** 부상자 명단(등재·이동·해제)과 출장 정지(·해제)는 코드가 아니라 서버가 붙인 이름으로 가른다 */
const SETBACK_LABELS = ["부상자 명단", "출장 정지"];

/**
 * 이동 알약의 바탕·글자 클래스.
 * 위기(부상자 명단 등재·이동, DFA, 방출, 출장 정지)는 빨강, 복귀·계약(명단 해제, 정지 해제, 계약)은 초록,
 * 소속이 바뀌는 일(FA 선언, 트레이드, 웨이버 클레임)은 보라.
 * 그 밖에는 옮겨 간 곳: 메이저(콜업 등)면 연파랑, 마이너(강등·이관·재활)면 회색, 모르면 옅은 회색.
 */
export function moveTone(move: RosterMove): string {
  const label = move.labelKo ?? "";
  if (SETBACK_LABELS.some((head) => label.startsWith(head))) {
    return TONE[label.endsWith("해제") ? "success" : "danger"];
  }
  if (label === "계약") return TONE.success;
  const byCode = TONE_BY_CODE[move.typeCode?.toUpperCase() ?? ""];
  if (byCode) return TONE[byCode];
  if (move.toLevel === "MLB") return TONE.majors;
  if (move.toLevel === "MINORS") return TONE.minors;
  return TONE.other;
}
