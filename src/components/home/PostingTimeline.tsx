"use client"; // '지금' 얼굴 자리와 '마지막 N일' 칸은 실제 폭으로 계산해야 해서(ResizeObserver) 클라이언트 컴포넌트다.

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { PostingDot } from "@/components/home/PostingDot";
import { useMoveWhenSeen } from "@/components/useMoveWhenSeen";

/** 지금 포스팅 제도의 협상 기간(일). 왼쪽 D-30 → 오른쪽 마감 */
const WINDOW_DAYS = 30;
/** '지금' 얼굴 지름 */
const FACE = 30;
/** 포스팅 선수가 여럿일 때 가까운 날짜 얼굴끼리 붙이는 중심 간격. 지름의 70%라 30%만 겹친다 */
const OVERLAP_STEP = Math.round(FACE * 0.7);
const TRACK = 8;
/** 막대와 '지금' 얼굴 사이 */
const NOW_GAP = 8;
/** '마지막 N일' 칸 위쪽 글자 두 줄('마지막 4일' / '9명 중 5명') 자리 */
const ZONE_LABEL = 34;
/** '마지막 N일' 칸이 막대보다 왼쪽으로 더 나온 폭 */
const ZONE_PAD = 10;
/** 서버에서 그릴 때 쓰는 폭(휴대폰 카드 안쪽). 붙은 뒤 실제 폭으로 다시 계산한다 */
const FIRST_WIDTH = 311;

export interface TimelineNow {
  key: string;
  nameKo: string;
  /** 마감까지 남은 날 */
  days: number;
  photoUrl: string | null;
}

interface Props {
  now: TimelineNow[];
  /** 막대를 '지금'까지 칠한다(협상 중인 선수 한 명일 때) */
  fill: boolean;
  startLabel: string;
  endLabel: string;
  /** '마지막 N일' 칸 */
  lateDays: number;
  /** 칸 안 둘째 줄('9명 중 5명이' 계약한 칸). 역대 계약이 없으면 null이고 칸도 그리지 않는다 */
  lateNote: string | null;
}

/**
 * 포스팅 선수가 여럿일 때 '지금' 얼굴을 한 줄에 놓는다. 마감(오른쪽)에 가까운 것부터 놓으면서, 바로 오른쪽 얼굴과
 * 중심 간격이 OVERLAP_STEP보다 가까우면 왼쪽으로 밀어 30%만 겹치게 붙인다. 오른쪽부터 놓아 마감 끝을 넘지 않는다.
 * 돌려주는 순서도 오른쪽부터다.
 */
function lineUp<T extends { days: number }>(items: T[], x: (d: number) => number) {
  const placed: { item: T; x: number }[] = [];
  for (const item of [...items].sort((a, b) => a.days - b.days)) {
    const ideal = x(item.days);
    const prev = placed[placed.length - 1];
    placed.push({ item, x: prev && prev.x - ideal < OVERLAP_STEP ? prev.x - OVERLAP_STEP : ideal });
  }
  return placed;
}

/**
 * MLB 도전 카드의 '계약까지 얼마나 걸릴까' 그래프. 왼쪽 협상 시작(D-30) → 오른쪽 마감 막대에 포스팅 중인 선수의
 * '지금'(막대 아래 파란 테두리 얼굴)만 둔다. 역대 계약 선수 얼굴은 세우지 않는다: 선수가 늘수록 겹쳐 안 보이고,
 * 계약 규모는 아래 순위 목록이 맡는다(사용자 결정 11-11, 이슈 #118). 역대 계약 시점은 마감 직전 며칠을 덮는
 * 회색 칸 하나와 그 안의 한 줄('9명 중 5명')로 요약한다.
 * 화면 읽기는 카드의 글(남은 날·요약 문장)이 맡으므로 그래프는 읽지 않는다.
 */
export default function PostingTimeline({ now, fill, startLabel, endLabel, lateDays, lateNote }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(FIRST_WIDTH);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // 그래프가 그려지듯 나타나는 움직임(globals.css의 grow-x·slide-from)은 화면에 보일 때 시작한다
  useMoveWhenSeen(ref);

  const pad = FACE / 2;
  const x = (d: number) => pad + ((WINDOW_DAYS - Math.min(WINDOW_DAYS, Math.max(0, d))) / WINDOW_DAYS) * (width - pad * 2);

  const nowFaces = lineUp(now, x);
  const hasZone = lateNote != null;
  const barTop = hasZone ? ZONE_LABEL : 4;
  const nowTop = barTop + TRACK + NOW_GAP;
  const height = nowFaces.length > 0 ? nowTop + FACE + 4 : barTop + TRACK + 6;
  // '마지막 N일' 칸: 마감 직전 며칠 구간의 막대 끝을 덮고, 위쪽에 칸 이름과 역대 계약 요약을 둔다
  const zoneLeft = x(lateDays) - ZONE_PAD;
  const zoneRight = width + 6;
  const fillTo = fill && now.length === 1 ? x(now[0].days) : 0;

  return (
    <div>
      <div ref={ref} aria-hidden className="relative" style={{ height }}>
        {hasZone && (
          <div
            className="absolute top-0 rounded-xl bg-surface-2"
            style={{ left: zoneLeft, width: zoneRight - zoneLeft, height: barTop + TRACK + 6 }}
          >
            <span className="absolute inset-x-0 top-1.5 whitespace-nowrap text-center text-[0.6875rem] font-bold leading-[1.35] text-muted">
              마지막 {lateDays}일
              <span className="block font-semibold text-foreground tabular-nums">{lateNote}</span>
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 rounded-full bg-neutral-pill" style={{ top: barTop, height: TRACK }}>
          {/* 협상 시작부터 지금까지 차오른다 */}
          {fillTo > 0 && <i className="grow-x absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: fillTo }} />}
        </div>
        {/* 포스팅 중인 선수의 '지금'은 막대 아래. 한 명이면 옆에 '지금'(마감 가까이면 글씨가 카드 밖으로 나가지 않게 왼쪽에) */}
        {[...nowFaces].reverse().map(({ item, x: px }) => {
          const labelLeft = px > width - 48;
          return (
          <span
            key={item.key}
            className={`slide-from absolute flex items-center gap-1.5 ${labelLeft ? "flex-row-reverse" : ""}`}
            style={
              {
                left: labelLeft ? undefined : px - FACE / 2,
                right: labelLeft ? width - px - FACE / 2 : undefined,
                top: nowTop,
                "--slide": `${pad - px}px`,
              } as CSSProperties
            }
          >
            <PostingDot nameKo={item.nameKo} photoUrl={item.photoUrl} size={FACE} now />
            {nowFaces.length === 1 && <span className="text-xs font-bold text-accent-ink">지금</span>}
          </span>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between gap-2 text-xs text-muted tabular-nums">
        <span>{startLabel}</span>
        {/* 포스팅 선수가 여럿이면 얼굴마다 '지금'을 붙이지 않고 한 번만 알린다 */}
        {nowFaces.length > 1 && <span className="font-semibold text-accent-ink">파란 테두리는 지금</span>}
        <span>{endLabel}</span>
      </div>
    </div>
  );
}
