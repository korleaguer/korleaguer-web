"use client"; // 사진이 안 뜰 때(onError) 구단 색 원으로 바꿔야 해서 클라이언트 컴포넌트다.

import type { CSSProperties } from "react";
import { textColorOn } from "@/lib/teams";
import { useImageFailed } from "@/lib/useImageFailed";

/** 동그라미 안에 쓸 이름 두 글자(이정후 → 정후). 두 글자 이름은 그대로 */
export function shortName(nameKo: string): string {
  return nameKo.length <= 2 ? nameKo : nameKo.slice(-2);
}

/**
 * 포스팅으로 계약한 선수 동그라미: 포스팅 당시 KBO 공식 등록 사진에 계약한 MLB 구단 색 안쪽 테두리.
 * 사진이 없거나 안 뜨면 구단 색 원 + 이름 두 글자.
 * MLB 도전 카드의 한 줄 그래프와 그 아래 계약 목록이 같은 모양을 써서 바로 짝지어진다.
 * 올해 계약한 포스팅 선수는 바깥에 초록 테두리(계약 = 초록)를 한 겹 더 두른다.
 */
export function PostingDot({
  nameKo,
  color,
  thisYear,
  photoUrl,
  size,
}: {
  nameKo: string;
  color: string;
  thisYear: boolean;
  photoUrl: string | null;
  size: number;
}) {
  const { failed, ref, onError } = useImageFailed(photoUrl);
  const ring = thisYear
    ? "0 0 0 2px var(--surface), 0 0 0 4px var(--success-fg)"
    : "0 0 0 2px var(--surface)";
  if (photoUrl && !failed) {
    // MLB 공식 증명사진(/photos/mlb-…, 2:3 세로, 모두 같은 틀)은 얼굴이 사진 폭의 70%로 꽉 찍혀 있다. 원을 채우면 얼굴이 꽉 차고
    // 모자 위가 잘려서, 원보다 작게(74%) 넣어 KBO 공식 사진(노시환, 얼굴이 원의 절반 남짓)과 얼굴 크기를 맞춘다.
    // 남는 둘레는 같은 사진을 흐리게 넓혀 깔아 채운다(증명사진마다 배경 회색이 달라 한 색으로 못 채운다).
    // 그 밖의 사진(KBO 등록 사진)은 원을 채우고 위쪽에 맞춘다.
    const headshot = photoUrl.startsWith("/photos/mlb-");
    return (
      <span
        aria-hidden
        className="relative block shrink-0 overflow-hidden rounded-full bg-avatar-bg"
        style={{ width: size, height: size, boxShadow: ring }}
      >
        {headshot ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- 같은 사진을 흐리게 깐 바탕 */}
            <img src={photoUrl} alt="" className="absolute inset-0 size-full scale-130 object-cover blur-[3px]" loading="lazy" />
            {/* eslint-disable-next-line @next/next/no-img-element -- 우리 서버가 호스팅하는 선수 사진, 크기 고정 */}
            <img
              ref={ref}
              src={photoUrl}
              alt=""
              onError={onError}
              className="absolute top-[8%] left-1/2 w-[74%] max-w-none -translate-x-1/2"
              loading="lazy"
            />
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- 우리 서버가 호스팅하는 선수 사진, 크기 고정
          <img ref={ref} src={photoUrl} alt="" onError={onError} className="size-full object-cover object-top" loading="lazy" />
        )}
        {/* 계약 구단 색 안쪽 테두리. 사진 위에 그려야 보인다 */}
        <span className="absolute inset-0 rounded-full" style={{ boxShadow: `inset 0 0 0 2px ${color}` }} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="posting-dot grid shrink-0 place-items-center rounded-full font-extrabold leading-none tracking-[-0.04em]"
      style={
        {
          "--dot": color,
          width: size,
          height: size,
          color: textColorOn(color),
          fontSize: Math.round(size * 0.37),
          boxShadow: ring,
        } as CSSProperties
      }
    >
      {shortName(nameKo)}
    </span>
  );
}
