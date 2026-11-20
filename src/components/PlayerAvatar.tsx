"use client"; // 사진이 안 뜰 때(onError) 대신 보여 줄 모양으로 바꿔야 해서 클라이언트 컴포넌트다.

import type { CSSProperties } from "react";
import { isMlbPhoto, smallPhoto } from "@/lib/photo";
import { teamColor, teamFill, textColorOn } from "@/lib/teams";
import { useImageFailed } from "@/lib/useImageFailed";

/** 원 지름(px). 24 표·순위 / 28 시즌 1위 / 44 경기 카드 / 56 선수 목록 / 96 선수 페이지 */
export type AvatarSize = 24 | 28 | 44 | 56 | 96;

/*
 * 사진이 없을 때 원 안 이니셜 크기. 글자 역할이 아니라 원 지름에 맞춘 그림 글자라 역할 토큰 밖이다(원 지름의 약 0.36~0.46배).
 * 기본 크기 이름(text-xs 등)은 @theme에서 껐으므로 크기 값을 그대로 적는다(11·12·16·20·36px).
 */
/* eslint-disable no-restricted-syntax -- 사진 원 크기에 맞춘 이니셜(그림 글자) */
const INITIAL_TEXT: Record<AvatarSize, string> = {
  24: "text-[0.6875rem]",
  28: "text-[0.75rem]",
  44: "text-[1rem]",
  56: "text-[1.25rem]",
  96: "text-[2.25rem]",
};
/* eslint-enable no-restricted-syntax */

interface Props {
  nameKo: string;
  photoUrl: string | null;
  teamAbbr: string | null;
  size: AvatarSize;
  /** 이름이 바로 옆에 있어서 사진을 읽어 줄 필요가 없으면 true. 기본은 96보다 작으면 true */
  decorative?: boolean;
  /** 선수 페이지 머리 카드처럼 색 띠 위에 걸칠 때 흰 테두리를 두른다 */
  ring?: boolean;
  /**
   * 첫 화면 안 사진이면 true: 바로 받는다(eager). lazy면 화면 배치를 마친 뒤에야 받기 시작해 첫 화면 사진이 늦게 뜬다
   * (web.dev 'lazy loading', 전수조사 L270, KboAvatar와 같다). 기본은 lazy(화면 밖 사진은 다가올 때 받는다)
   */
  eager?: boolean;
}

/**
 * 원형 선수 사진. api가 주는 사진은 배경을 지운 MLB 사진(정사각형)이라,
 * 원 안에 조금 작게 아래쪽에 붙여 얼굴 둘레에 여백을 둔다.
 * 사진이 없거나 안 뜨면 팀 색 원 + 이름 첫 글자로 대신한다.
 * 배경 없는 MLB 사진(/photos/mlb-…)은 원 바탕을 사진 속 유니폼 팀 색으로 칠한다(11-21 사용자 결정). 배경이 있는 사진(KBO)과
 * 흰 바탕 편집본(posting-…)은 칠하면 지저분해서 기존 중립 바탕을 쓴다. 다크 모드는 teamFill이 어두운 팀만 밝힌다
 */
export default function PlayerAvatar({
  nameKo,
  photoUrl,
  teamAbbr,
  size,
  decorative = size < 96,
  ring = false,
  eager = false,
}: Props) {
  const { failed, ref, onError } = useImageFailed(photoUrl);
  // 화면 배율에 맞춰 줄인 사진(lib/photo, 56px 이하 원과 96px 원)
  const small = smallPhoto(photoUrl, size);
  // 크기를 고정해 두면 사진이 늦게 떠도 레이아웃이 흔들리지 않는다.
  const box = { width: size, height: size };
  const ringClass = ring ? "border-4 border-surface shadow-[0_1px_4px_rgb(0_0_0/0.14)]" : "";

  const fill = teamFill(teamAbbr);
  // 밝은·어두운 색을 변수로 넘기고 클래스가 모드를 고른다(이니셜 원도 같은 색)
  const fillStyle = fill
    ? ({ "--fill-l": fill.light, "--fill-d": fill.dark, "--ink-l": fill.lightText, "--ink-d": fill.darkText } as CSSProperties)
    : undefined;

  if (!photoUrl || failed) {
    if (fill) {
      return (
        <span
          aria-hidden
          className={`inline-flex shrink-0 items-center justify-center rounded-full bg-(--fill-l) font-extrabold text-(--ink-l) dark:bg-(--fill-d) dark:text-(--ink-d) ${INITIAL_TEXT[size]} ${ringClass}`}
          style={{ ...box, ...fillStyle }}
        >
          {nameKo.charAt(0)}
        </span>
      );
    }
    const color = teamColor(teamAbbr);
    return (
      <span
        aria-hidden
        className={`inline-flex shrink-0 items-center justify-center rounded-full font-extrabold ${INITIAL_TEXT[size]} ${ringClass}`}
        style={{ ...box, backgroundColor: color, color: textColorOn(color) }}
      >
        {nameKo.charAt(0)}
      </span>
    );
  }

  // 사진 속 팀 색 바탕: 배경 없는 MLB 사진일 때만
  const teamBg = fill !== null && isMlbPhoto(photoUrl);
  return (
    <span
      className={`inline-block shrink-0 overflow-hidden rounded-full ${teamBg ? "bg-(--fill-l) dark:bg-(--fill-d)" : "bg-avatar-bg"} ${ringClass}`}
      style={teamBg ? { ...box, ...fillStyle } : box}
    >
      {/* 사진은 우리가 호스팅한다(/photos/…, api가 원본을 한 번 받아 저장). 크기를 고정한 작은 사진이라 next/image는 쓰지 않는다. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- 우리가 호스팅하는 작은 사진 */}
      <img
        ref={ref}
        src={small?.src ?? photoUrl}
        srcSet={small?.srcSet}
        alt={decorative ? "" : `${nameKo} 사진`}
        width={size}
        height={size}
        loading={eager ? "eager" : "lazy"}
        referrerPolicy="no-referrer"
        onError={onError}
        className="block size-full object-contain object-bottom pl-[8%] pr-[8%] pt-[12%]"
      />
    </span>
  );
}
