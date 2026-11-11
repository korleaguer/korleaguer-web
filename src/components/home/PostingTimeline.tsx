"use client"; // 동그라미가 겹치는지는 실제 폭으로 계산해야 해서(ResizeObserver) 클라이언트 컴포넌트다.

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { PostingDot, shortName } from "@/components/home/PostingDot";
import { useMoveWhenSeen } from "@/components/useMoveWhenSeen";
import { useImageFailed } from "@/lib/useImageFailed";

/** 지금 포스팅 제도의 협상 기간(일). 왼쪽 D-30 → 오른쪽 마감 */
const WINDOW_DAYS = 30;
/** 선배 동그라미 지름 */
const DOT = 32;
/** 겹쳐 쌓을 때 한 층 높이. 지름보다 조금 작아 동전처럼 살짝 겹친다 */
const STEP = 29;
/** '지금' 표시(사진이나 이름 원) 지름 */
const FACE = 30;
const TRACK = 8;
/** '마지막 N일' 글자 자리 */
const ZONE_LABEL = 22;
/** 서버에서 그릴 때 쓰는 폭(휴대폰 카드 안쪽). 붙은 뒤 실제 폭으로 다시 계산한다 */
const FIRST_WIDTH = 319;

export interface TimelineDot {
  key: string;
  nameKo: string;
  /** 계약한 MLB 구단 색 */
  color: string;
  /** 마감 며칠 전에 합의했나(마감 당일 0) */
  days: number;
  /** 올해 계약한 포스팅 선수 */
  thisYear: boolean;
  /** 포스팅 당시 KBO 공식 등록 사진 */
  photoUrl: string | null;
}

export interface TimelineNow {
  key: string;
  nameKo: string;
  /** 마감까지 남은 날 */
  days: number;
  photoUrl: string | null;
  /** 사진이 없을 때 원 색(KBO 구단 색) */
  color: string;
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

/** 왼쪽부터 놓으면서, 같은 층의 앞 것과 gap보다 가까우면 한 층 올린다(내린다) */
function stack<T extends { days: number }>(items: T[], x: (d: number) => number, gap: number) {
  const placed: { item: T; x: number; level: number }[] = [];
  for (const item of items) {
    const px = x(item.days);
    let level = 0;
    while (placed.some((p) => p.level === level && Math.abs(p.x - px) < gap)) level++;
    placed.push({ item, x: px, level });
  }
  return placed;
}

/**
 * MLB 도전 카드의 한 줄 그래프. 왼쪽 협상 시작(D-30) → 오른쪽 마감 막대 위에
 * 선배들이 계약한 때를 구단 색 동그라미로 쌓고, 포스팅 중인 선수의 '지금'을 막대 위 사진으로 둔다.
 * 마감 직전 며칠은 회색 칸으로 묶어 '막판에 몰린다'가 한눈에 보이게 한다.
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

  const pad = DOT / 2 + 1;
  const x = (d: number) => pad + ((WINDOW_DAYS - Math.min(WINDOW_DAYS, Math.max(0, d))) / WINDOW_DAYS) * (width - pad * 2);

  // 일찍 계약한 선배부터(왼쪽부터) 놓고, 옆 동그라미와 많이 겹치면 한 층 위로 쌓는다
  const placed = stack(
    [...dots].sort((a, b) => b.days - a.days || Number(b.thisYear) - Number(a.thisYear)),
    x,
    DOT * 0.8,
  );
  const topLevel = placed.reduce((m, p) => Math.max(m, p.level), 0);
  const base = dots.length > 0 ? ZONE_LABEL + topLevel * STEP + DOT : 0; // 맨 아래 층 동그라미의 바닥
  // 막대 위 '지금' 표시가 맨 아래 층 동그라미에 닿지 않게 띄운다
  const trackTop = dots.length > 0 ? base + 14 : FACE / 2;
  // '지금' 사진끼리 겹치면 뒤의 것을 막대 아래로 한 칸씩 내린다
  const faces = stack([...now].sort((a, b) => b.days - a.days), x, FACE + 2);
  const lowLevel = faces.reduce((m, f) => Math.max(m, f.level), 0);
  const endsTop = trackTop + TRACK / 2 + FACE / 2 + 6 + lowLevel * (FACE - 4);
  const zoneLeft = Math.max(0, x(lateDays) - DOT / 2 - 5);
  const zoneRight = Math.min(width, x(0) + DOT / 2 + 5);
  const fillTo = fill && now.length === 1 ? x(now[0].days) : 0;

  return (
    <div ref={ref} aria-hidden className="relative" style={{ height: endsTop + 16 }}>
      {dots.length > 0 && (
        <div
          className="absolute top-0 rounded-[10px] bg-surface-2"
          style={{ left: zoneLeft, width: zoneRight - zoneLeft, height: base + 4 }}
        >
          <span className="absolute inset-x-0 top-1.5 whitespace-nowrap text-center text-[0.6875rem] font-bold leading-none text-muted">
            마지막 {lateDays}일
          </span>
        </div>
      )}
      {/* 선배 동그라미는 '협상 시작'(왼쪽 끝)에서 계약한 날 자리로 미끄러져 퍼진다 */}
      {placed.map(({ item, x: px, level }, i) => (
        <span
          key={item.key}
          className="slide-from absolute"
          style={{ left: px - DOT / 2, top: base - DOT - level * STEP, "--slide": `${pad - px}px`, "--i": i } as CSSProperties}
        >
          <PostingDot nameKo={item.nameKo} color={item.color} thisYear={item.thisYear} photoUrl={item.photoUrl} size={DOT} />
        </span>
      ))}
      <div className="absolute inset-x-0 overflow-hidden rounded-full bg-surface-2" style={{ top: trackTop, height: TRACK }}>
        {/* 협상 시작부터 지금까지 차오른다 */}
        {fillTo > 0 && <i className="grow-x absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: fillTo }} />}
      </div>
      {/* 포스팅 선수 사진은 차오르는 막대 끝을 타고 지금 자리로 온다 */}
      {faces.map(({ item, x: px, level }) => (
        <span
          key={item.key}
          className="slide-from absolute z-10"
          style={
            {
              left: px - FACE / 2,
              top: trackTop + TRACK / 2 - FACE / 2 + level * (FACE - 4),
              "--slide": `${pad - px}px`,
            } as CSSProperties
          }
        >
          <NowFace now={item} />
        </span>
      ))}
      <div className="absolute inset-x-0 flex justify-between text-xs text-muted tabular-nums" style={{ top: endsTop }}>
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </div>
  );
}

/** 포스팅 중인 선수의 '지금': 사진(여러 명이거나 사진이 없으면 구단 색 원 + 이름 두 글자)에 진한 테두리 */
function NowFace({ now }: { now: TimelineNow }) {
  const { failed, ref, onError } = useImageFailed(now.photoUrl);
  const ring = "0 0 0 2px var(--surface), 0 0 0 4px var(--foreground)";
  if (!now.photoUrl || failed) {
    return (
      <span
        className="posting-dot grid place-items-center rounded-full text-[0.6875rem] font-extrabold leading-none tracking-[-0.04em] text-white"
        style={{ "--dot": now.color, width: FACE, height: FACE, boxShadow: ring } as CSSProperties}
      >
        {shortName(now.nameKo)}
      </span>
    );
  }
  return (
    <span className="block overflow-hidden rounded-full bg-avatar-bg" style={{ width: FACE, height: FACE, boxShadow: ring }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 외부 구단 사진, 크기 고정 */}
      <img ref={ref} src={now.photoUrl} alt="" onError={onError} className="size-full object-cover object-top" loading="lazy" referrerPolicy="no-referrer" />
    </span>
  );
}
