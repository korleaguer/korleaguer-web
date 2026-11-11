"use client"; // 얼굴이 겹치는지는 실제 폭으로 계산해야 해서(ResizeObserver) 클라이언트 컴포넌트다.

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { PostingDot } from "@/components/home/PostingDot";
import { useMoveWhenSeen } from "@/components/useMoveWhenSeen";

/** 지금 포스팅 제도의 협상 기간(일). 왼쪽 D-30 → 오른쪽 마감 */
const WINDOW_DAYS = 30;
/** 얼굴 지름(계약한 선수와 '지금' 모두) */
const FACE = 30;
/** 가까운 날짜 얼굴끼리 붙일 때 중심 간격. 지름의 70%라 30%만 겹친다 */
const OVERLAP_STEP = Math.round(FACE * 0.7);
/** 얼굴 아래와 막대 사이(얼굴이 막대 위에 선다) */
const STAND_GAP = 4;
const TRACK = 8;
/** 막대와 '지금' 얼굴 사이 */
const NOW_GAP = 8;
/** '마지막 N일' 글자 자리 */
const ZONE_LABEL = 20;
/** 서버에서 그릴 때 쓰는 폭(휴대폰 카드 안쪽). 붙은 뒤 실제 폭으로 다시 계산한다 */
const FIRST_WIDTH = 311;

export interface TimelineDot {
  key: string;
  nameKo: string;
  /** 마감 며칠 전에 합의했나(마감 당일 0) */
  days: number;
  /** 선수 사진(지난 선수는 흰 바탕 편집본 /photos/posting-…) */
  photoUrl: string | null;
}

export interface TimelineNow {
  key: string;
  nameKo: string;
  /** 마감까지 남은 날 */
  days: number;
  photoUrl: string | null;
}

interface Props {
  dots: TimelineDot[];
  now: TimelineNow[];
  /** 막대를 '지금'까지 칠한다(협상 중인 선수 한 명일 때) */
  fill: boolean;
  startLabel: string;
  endLabel: string;
  /** '마지막 N일' 칸 */
  lateDays: number;
}

/**
 * 얼굴을 한 줄에 놓는다(층으로 쌓지 않는다). 마감(오른쪽)에 가까운 것부터 놓으면서, 바로 오른쪽 얼굴과
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
 * MLB 도전 카드의 한 줄 그래프(이슈 #105). 왼쪽 협상 시작(D-30) → 오른쪽 마감 막대 위에
 * 계약한 선수 얼굴을 한 줄로 세우고, 막대 안에는 계약한 날마다 속 빈 점을 찍는다(얼굴이 겹쳐 밀려도 날짜는 점이 말한다).
 * 포스팅 중인 선수의 '지금'은 막대 아래 파란 테두리 얼굴. 마감 직전 며칠은 회색 칸으로 묶어 '막판에 몰린다'가 한눈에 보이게 한다.
 * 화면 읽기는 카드의 글(남은 날·계약 목록)이 맡으므로 그래프는 읽지 않는다.
 */
export default function PostingTimeline({ dots, now, fill, startLabel, endLabel, lateDays }: Props) {
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

  const faces = lineUp(dots, x);
  const nowFaces = lineUp(now, x);
  const hasDots = dots.length > 0;
  const faceTop = ZONE_LABEL;
  const barTop = hasDots ? faceTop + FACE + STAND_GAP : 4;
  const nowTop = barTop + TRACK + NOW_GAP;
  const height = nowFaces.length > 0 ? nowTop + FACE + 4 : barTop + TRACK + 6;
  // '마지막 N일' 칸: 마감 직전 얼굴 묶음(밀려난 얼굴 포함)과 막대 끝을 함께 덮는다
  const lateXs = faces.filter((f) => f.item.days <= lateDays).map((f) => f.x);
  const zoneLeft = Math.min(x(lateDays), ...lateXs) - FACE / 2 - 6;
  const zoneRight = width + 6;
  const fillTo = fill && now.length === 1 ? x(now[0].days) : 0;

  return (
    <div>
      <div ref={ref} aria-hidden className="relative" style={{ height }}>
        {hasDots && (
          <div
            className="absolute top-0 rounded-xl bg-surface-2"
            style={{ left: zoneLeft, width: zoneRight - zoneLeft, height: barTop + TRACK + 6 }}
          >
            <span className="absolute inset-x-0 top-1.5 whitespace-nowrap text-center text-[0.6875rem] font-bold leading-none text-muted">
              마지막 {lateDays}일
            </span>
          </div>
        )}
        {/* 계약한 선수 얼굴은 '협상 시작'(왼쪽 끝)에서 제자리로 미끄러진다. 오른쪽(마감 쪽) 얼굴이 위에 온다 */}
        {[...faces].reverse().map(({ item, x: px }, i) => (
          <span
            key={item.key}
            className="slide-from absolute"
            style={{ left: px - FACE / 2, top: faceTop, "--slide": `${pad - px}px`, "--i": i } as CSSProperties}
          >
            <PostingDot nameKo={item.nameKo} photoUrl={item.photoUrl} size={FACE} />
          </span>
        ))}
        <div className="absolute inset-x-0 rounded-full bg-neutral-pill" style={{ top: barTop, height: TRACK }}>
          {/* 협상 시작부터 지금까지 차오른다 */}
          {fillTo > 0 && <i className="grow-x absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: fillTo }} />}
          {/* 계약한 날: 속 빈 점(카드 색 + 회색 테두리). 바깥 지름 8px = 막대 두께라 막대 밖으로 튀어나오지 않는다.
              얼굴보다 가볍고 파란 막대 위에서도 또렷하다 */}
          {dots.map((d) => (
            <i
              key={d.key}
              className="absolute top-1/2 size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface ring-[1.5px] ring-muted"
              style={{ left: x(d.days) }}
            />
          ))}
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
