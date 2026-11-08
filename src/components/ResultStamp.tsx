import type { CSSProperties } from "react";
import type { GameResult } from "@/lib/api";
import { formatDate, formatShortDate } from "@/lib/format";

type Size = "sm" | "md";

const SIZES: Record<Size, string> = {
  sm: "h-7 min-w-9 px-1.5 text-xs", // 표 안 (결과만)
  md: "h-11 min-w-12 gap-1 px-1.5 text-sm", // 목록 (결과 + 날짜)
};

const INK = { W: "text-ink-win", L: "text-ink-loss", T: "text-ink-tie" } as const;
const WORD = { W: "승", L: "패", T: "무" } as const;

// 도장이 살짝 비뚤게 찍힌 각도. 같은 경기는 새로고침해도 같은 각도다.
const TILTS = [-2, 1.5, -1, 2, -1.5, 1];

interface Props {
  result: GameResult;
  /** 도장 각도를 정하는 데 쓴다 */
  gameId: number;
  size?: Size;
  /** 경기 시각(ISO). md 도장 안에 "9.27"처럼 작게 찍는다 */
  date?: string | null;
  /** 홈 목록에서 위에서부터 차례로 찍히는 순서. 없으면 움직이지 않는다 */
  pressIndex?: number;
}

/**
 * 팀 승패 도장: 승(초록) / 패(빨강) / 무(보라).
 * 결과가 없으면(경기 전·중 등) 점선 빈 자리만 그린다. 상태 문구는 summary가 맡는다.
 */
export default function ResultStamp({ result, gameId, size = "sm", date, pressIndex }: Props) {
  const style = {
    "--tilt": `${TILTS[gameId % TILTS.length]}deg`,
    ...(pressIndex != null && { "--i": pressIndex }),
  } as CSSProperties;
  const motion = pressIndex != null ? "stamp-press" : "";
  const dateMark = size === "md" && date ? <StampDate value={date} /> : null;

  if (result === null) {
    return (
      <span className={`stamp stamp-empty ${SIZES[size]} text-muted ${motion}`} style={style}>
        <span aria-hidden>–</span>
        <span className="sr-only">결과 없음</span>
        {dateMark}
      </span>
    );
  }

  return (
    <span className={`stamp ${SIZES[size]} ${INK[result]} ${motion}`} style={style}>
      <span>{WORD[result]}</span>
      {dateMark}
    </span>
  );
}

/** 눈에는 "9.27", 화면 낭독기에는 "9월 27일(일)" */
function StampDate({ value }: { value: string }) {
  return (
    <>
      <span aria-hidden className="text-[0.625rem] font-semibold tracking-tight tabular-nums">
        {formatShortDate(value)}
      </span>
      <span className="sr-only">{` ${formatDate(value)}`}</span>
    </>
  );
}
