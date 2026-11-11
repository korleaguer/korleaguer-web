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
    return (
      <span
        aria-hidden
        className="block shrink-0 overflow-hidden rounded-full bg-avatar-bg"
        style={{ width: size, height: size, boxShadow: ring, outline: `2px solid ${color}`, outlineOffset: -2 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 우리 서버가 호스팅하는 KBO 사진, 크기 고정 */}
        <img ref={ref} src={photoUrl} alt="" onError={onError} className="size-full object-cover object-top" loading="lazy" />
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
