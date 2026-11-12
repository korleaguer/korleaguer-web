"use client"; // 소속팀 사진을 고르는 상태가 있어서 클라이언트 컴포넌트다.

import { useState, type CSSProperties, type ReactNode } from "react";
import { haptic } from "@/lib/app";

/** 머리 카드에 넘겨 볼 사진 한 장(소속팀 하나) */
export interface Shot {
  key: string;
  /** "키움 히어로즈", 지금 팀은 "샌프란시스코" */
  label: string;
  /** "2017–2023". 지금 팀은 null */
  years: string | null;
  photoUrl: string | null;
  /** 그 팀 대표 색(띠·사진이 없을 때 원) */
  color: string;
  /**
   * mlb: 배경을 지운 MLB 사진(원 안에 조금 작게 아래쪽에 붙인다, PlayerAvatar와 같게)
   * kbo: KBO 공식 증명사진(배경 있는 세로 사진이라 원을 꽉 채우고 얼굴 쪽에 맞춘다)
   */
  kind: "mlb" | "kbo";
}

const PHOTO_CLASS: Record<Shot["kind"], string> = {
  mlb: "object-contain object-bottom pl-[8%] pr-[8%] pt-[12%]",
  kbo: "object-cover object-[50%_22%]",
};

/**
 * 선수 페이지 머리 카드의 팀 색 띠 + 사진 원 + 소속팀 사진 알약.
 * 알약이나 사진을 누르면 그 팀 시절 사진으로 교차 페이드하고, 띠 색이 그 팀 색으로 옮겨 간다(globals.css의 --team 전환).
 * 사진이 한 장뿐이면 알약 없이 지금처럼 보인다. 움직임 줄이기 설정이면 바로 바뀐다.
 * toggle은 사진 오른쪽('내 선수' 버튼), children은 이름·기본 정보(서버가 그린다)다.
 */
export default function PhotoStage({
  nameKo,
  shots,
  initial,
  toggle,
  children,
}: {
  nameKo: string;
  shots: Shot[];
  initial: number;
  toggle: ReactNode;
  children: ReactNode;
}) {
  const [index, setIndex] = useState(initial);
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const shot = shots[index] ?? shots[0];
  const many = shots.length > 1;
  // 사진을 바꿀 때마다 앱 안이면 고르기 틱
  const pick = (i: number) => {
    if (i === index) return;
    haptic("select");
    setIndex(i);
  };
  const next = () => pick((index + 1) % shots.length);

  const circle = (
    <span
      className="relative block size-24 shrink-0 overflow-hidden rounded-full border-4 border-surface bg-avatar-bg shadow-[0_1px_4px_rgb(0_0_0/0.14)]"
    >
      {shots.map((s, i) => {
        const active = i === index;
        const motion =
          "transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none";
        const visibility = active ? "opacity-100 scale-100" : "opacity-0 scale-[0.96]";
        if (!s.photoUrl || failed.has(s.key)) {
          return (
            <span
              key={s.key}
              aria-hidden
              className={`absolute inset-0 grid place-items-center text-4xl font-extrabold text-white ${motion} ${visibility}`}
              style={{ backgroundColor: s.color }}
            >
              {nameKo.charAt(0)}
            </span>
          );
        }
        return (
          // eslint-disable-next-line @next/next/no-img-element -- 우리가 호스팅하는 작은 사진(/photos/…)
          <img
            key={s.key}
            src={s.photoUrl}
            alt={active ? `${nameKo} ${s.label}${s.years ? ` ${s.years}` : ""} 사진` : ""}
            width={96}
            height={96}
            loading={active ? "eager" : "lazy"}
            onError={() => setFailed((f) => new Set(f).add(s.key))}
            className={`absolute inset-0 block size-full ${PHOTO_CLASS[s.kind]} ${motion} ${visibility}`}
          />
        );
      })}
    </span>
  );

  return (
    <>
      <div aria-hidden className="team-band h-[68px]" style={{ "--team": shot.color } as CSSProperties} />
      <div className="-mt-11 px-4 pb-4 sm:px-5 sm:pb-5">
        {/* 자리가 모자라면(큰 글씨 등) '내 선수' 버튼이 사진 아래로 내려간다 */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          {many ? (
            <button
              type="button"
              onClick={next}
              aria-label={`다음 소속팀 사진 보기 (지금: ${shot.label})`}
              className="rounded-full transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none"
            >
              {circle}
            </button>
          ) : (
            circle
          )}
          {toggle}
        </div>
        {children}
        {many && (
          <div role="group" aria-label="소속팀별 사진" className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-xs text-muted">소속팀 사진</span>
            {shots.map((s, i) => {
              const active = i === index;
              return (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => pick(i)}
                  className={`press tap-target inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-[0.8125rem] font-semibold leading-5 transition duration-150 motion-reduce:transition-none ${
                    active ? "bg-accent-soft text-accent-ink" : "bg-surface-2 text-muted hover:text-foreground"
                  }`}
                >
                  <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                  {s.years && <span className="font-normal tabular-nums">{s.years}</span>}
                </button>
              );
            })}
          </div>
        )}
        <p className="sr-only" aria-live="polite">
          {many ? `${shot.label}${shot.years ? ` ${shot.years}` : ""} 사진` : ""}
        </p>
      </div>
    </>
  );
}
