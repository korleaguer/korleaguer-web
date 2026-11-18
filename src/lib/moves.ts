// 이동 기록(콜업·강등·부상자 명단 등) 알약 색. 선수 페이지 이동 기록 칸(RosterMoves)과 경기 달력 아래 그달 이동 줄(GameCalendar)이
// 같은 알약(MovePill)으로 쓴다.
import type { RosterMove } from "./api";

const TONE = {
  // 위기는 빨간 바탕·글자 대신 회색 알약 + 본문 글자이고, 빨강은 알약 앞 점(MovePill)에만 둔다.
  // 빨간 글자·바탕은 '좋은 활약' 주황과 거의 같은 색이라(글자 색차 9.1, 바탕 5.6) 성적표의 '좋은 시즌'과
  // '부상자 명단'이 한눈에 같은 붉은 알약으로 읽혔다(전수조사, 사용자 11-17 '추천대로'). 회색 바탕은 주황 바탕과 색차 9.7
  danger: "bg-neutral-pill text-foreground",
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

function toneOf(move: RosterMove): keyof typeof TONE {
  const label = move.labelKo ?? "";
  if (SETBACK_LABELS.some((head) => label.startsWith(head))) {
    return label.endsWith("해제") ? "success" : "danger";
  }
  if (label === "계약") return "success";
  const byCode = TONE_BY_CODE[move.typeCode?.toUpperCase() ?? ""];
  if (byCode) return byCode;
  if (move.toLevel === "MLB") return "majors";
  if (move.toLevel === "MINORS") return "minors";
  return "other";
}

/**
 * 이동 알약의 바탕·글자 클래스와 앞에 빨간 점을 둘지(setback).
 * 위기(부상자 명단 등재·이동, DFA, 방출, 출장 정지)는 회색 알약 + 빨간 점, 복귀·계약(명단 해제, 정지 해제, 계약)은 초록,
 * 소속이 바뀌는 일(FA 선언, 트레이드, 웨이버 클레임)은 보라.
 * 그 밖에는 옮겨 간 곳: 메이저(콜업 등)면 연파랑, 마이너(강등·이관·재활)면 회색, 모르면 옅은 회색.
 */
export function moveTone(move: RosterMove): { className: string; setback: boolean } {
  const tone = toneOf(move);
  return { className: TONE[tone], setback: tone === "danger" };
}
