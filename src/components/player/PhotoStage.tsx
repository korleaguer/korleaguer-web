"use client"; // 소속팀 사진을 고르는 상태가 있어서 클라이언트 컴포넌트다.

import { useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { haptic } from "@/lib/app";
import { smallPhoto, STAGE_DIAMETER } from "@/lib/photo";

/** 머리 카드에 넘겨 볼 사진 한 장(소속팀 하나) */
export interface Shot {
  key: string;
  /** "키움 히어로즈", 지금 팀은 "샌프란시스코"(FA·국내 복귀면 마지막 MLB 팀 "전 미네소타") */
  label: string;
  /** "2017–2023". 지금 팀은 null */
  years: string | null;
  photoUrl: string | null;
  /** 그 팀 대표 색(띠·사진이 없을 때 원) */
  color: string;
  /**
   * silo: 배경 없는 사진(MLB 사진과 api의 과거 소속팀 편집본 /photos/career-…). 둘은 얼굴 크기·위치가 같은 틀이라
   *       같은 자리(원 안에 조금 작게 아래쪽, PlayerAvatar와 같게)에 둔다
   * cover: 배경 있는 KBO 증명사진(옛 api가 주던 /photos/kbo-…). 원을 꽉 채우고 얼굴 쪽에 맞춘다
   */
  frame: "silo" | "cover";
}

const PHOTO_CLASS: Record<Shot["frame"], string> = {
  silo: "object-contain object-bottom pl-[8%] pr-[8%] pt-[12%]",
  cover: "object-cover object-[50%_22%]",
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
  /**
   * 사진 원을 눌러 넘겼을 때만 낭독기에 알릴 말('키움 히어로즈 2017–2023 사진'). 원은 눌러도 포커스가 원에 남아 무엇으로 바뀌었는지
   * 들을 수 없다. 알약(라디오)은 고르면 낭독기가 그 알약 이름과 '선택됨'을 읽으므로 또 알리지 않는다(같은 말 두 번)
   */
  const [spoken, setSpoken] = useState("");
  const labelId = useId();
  const pillsRef = useRef<HTMLSpanElement>(null);
  const shot = shots[index] ?? shots[0];
  const many = shots.length > 1;
  // 사진을 바꿀 때마다 앱 안이면 고르기 틱
  const pick = (i: number) => {
    if (i === index) return;
    haptic("select");
    setIndex(i);
  };
  const next = () => {
    const i = (index + 1) % shots.length;
    const s = shots[i];
    pick(i);
    setSpoken(`${s.label}${s.years ? ` ${s.years}` : ""} 사진`);
  };
  /** 알약(라디오)으로 고른다. 낭독기는 고른 알약을 읽으니 원으로 넘길 때의 알림은 지운다 */
  const choose = (i: number) => {
    pick(i);
    setSpoken("");
  };
  /** 고른 알약에서 ←↑ 앞, →↓ 다음(끝에서는 반대쪽 끝으로), Home·End 처음·끝. 옮기면 바로 고른다(경기별 막대와 같은 라디오 묶음) */
  function onPillKey(e: KeyboardEvent<HTMLSpanElement>) {
    // 키를 꾹 누르면 다시 그리기 전에 또 와서 state(index)는 한 칸 늦다. 포커스는 바로 옮겨 두므로 포커스가 있는 알약에서 센다
    const at = Number((e.target as HTMLElement).closest("[data-shot]")?.getAttribute("data-shot") ?? index);
    const step = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : 0;
    const to =
      step !== 0 ? (at + step + shots.length) % shots.length : e.key === "Home" ? 0 : e.key === "End" ? shots.length - 1 : null;
    if (to == null) return;
    e.preventDefault();
    choose(to);
    pillsRef.current?.querySelector<HTMLElement>(`[data-shot="${to}"]`)?.focus();
  }

  const circle = (
    <span
      className="relative block size-24 shrink-0 overflow-hidden rounded-full border-4 border-surface bg-avatar-bg shadow-[0_1px_4px_rgb(0_0_0/0.14)]"
    >
      {shots.map((s, i) => {
        const active = i === index;
        const motion =
          "transition-[opacity,transform] duration-300 ease-out-expo motion-reduce:transition-none";
        const visibility = active ? "opacity-100 scale-100" : "opacity-0 scale-[0.96]";
        if (!s.photoUrl || failed.has(s.key)) {
          return (
            <span
              key={s.key}
              aria-hidden
              // eslint-disable-next-line no-restricted-syntax -- 사진 원 크기(96px)에 맞춘 이니셜(그림 글자)
              className={`absolute inset-0 grid place-items-center text-[2.25rem] font-extrabold text-white ${motion} ${visibility}`}
              style={{ backgroundColor: s.color }}
            >
              {nameKo.charAt(0)}
            </span>
          );
        }
        // 원(96px)의 2배·3배로 줄인 webp(192·288px). 원본은 MLB 사진 360px, 과거 소속팀 편집본 288px PNG(약 88KB)였다(전수조사 L341)
        const small = smallPhoto(s.photoUrl, STAGE_DIAMETER);
        return (
          // eslint-disable-next-line @next/next/no-img-element -- 우리가 호스팅하는 작은 사진(/photos/…)
          <img
            key={s.key}
            src={small?.src ?? s.photoUrl}
            srcSet={small?.srcSet}
            alt={active ? `${nameKo} ${s.label}${s.years ? ` ${s.years}` : ""} 사진` : ""}
            width={STAGE_DIAMETER}
            height={STAGE_DIAMETER}
            loading={active ? "eager" : "lazy"}
            // 안 보이는 소속팀 사진도 같은 원 안에 겹쳐 있어 화면 안으로 쳐서 lazy가 미루지 못한다. 넘길 때 바로 보이게 받아 두되,
            // 보이는 사진·다른 첫 화면 요청보다 뒤에 받는다
            fetchPriority={active ? undefined : "low"}
            onError={() => setFailed((f) => new Set(f).add(s.key))}
            className={`absolute inset-0 block size-full ${PHOTO_CLASS[s.frame]} ${motion} ${visibility}`}
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
              // '지금:'은 FA·국내 복귀 선수에게 지금 소속처럼 읽혀서(지금: 미네소타) 보이는 사진이 무엇인지만 말한다
              aria-label={`다음 소속팀 사진 보기 (보이는 사진: ${shot.label})`}
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
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {/* 휴대폰에서는 이름표를 윗줄에 둔다. 한 줄에 두면 알약이 갈려 지금 팀 알약만 혼자 다음 줄로 떨어졌다(이슈 #200) */}
            <span id={labelId} className="mr-0.5 w-full text-caption text-muted sm:w-auto">
              소속팀 사진
            </span>
            {/* 알약끼리만 묶어 여러 줄로 감길 때 줄 사이를 넓힌다(넓힌 누름 영역 44px가 겹치지 않게, 이슈 #257). 이름표와의 간격은 그대로.
                사진은 늘 하나만 보이니 알약은 켜고 끄는 버튼(aria-pressed)이 아니라 라디오 묶음이다(WAI-ARIA APG Radio Group, 전수조사 L328,
                경기별 막대와 같다). Tab 한 번에 고른 알약으로 들어와 화살표로 바로 고르고, 다음 Tab은 묶음 밖으로. 이름은 보이는 이름표 */}
            <span
              ref={pillsRef}
              role="radiogroup"
              aria-labelledby={labelId}
              onKeyDown={onPillKey}
              className="flex flex-wrap items-center gap-x-1.5 gap-y-[max(0.75rem,calc(44px-2rem))]"
            >
            {shots.map((s, i) => {
              const active = i === index;
              return (
                <button
                  key={s.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  tabIndex={active ? 0 : -1}
                  data-shot={i}
                  onClick={() => choose(i)}
                  // 큰 글씨에서 한 줄에 못 들어가면 팀 이름은 그대로 두고 연도만 알약 안 다음 줄로('키움/히어로즈'로 갈리지 않게, 이슈 #264)
                  className={`press tap-target inline-flex min-h-8 flex-wrap items-center gap-x-1.5 rounded-full px-2.5 text-label transition duration-150 motion-reduce:transition-none ${
                    active ? "bg-accent-soft text-accent-ink" : "bg-surface-2 text-muted hover:text-foreground"
                  }`}
                >
                  <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  {/* 고른 사진 알약은 이름도 굵게(이슈 #260) */}
                  <span className={`bold-reserve whitespace-nowrap ${active ? "font-extrabold" : ""}`} data-text={s.label}>
                    {s.label}
                  </span>
                  {s.years && <span className="font-normal tabular-nums">{s.years}</span>}
                </button>
              );
            })}
            </span>
          </div>
        )}
        <p className="sr-only" aria-live="polite">
          {spoken}
        </p>
      </div>
    </>
  );
}
