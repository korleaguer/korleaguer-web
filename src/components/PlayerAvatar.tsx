"use client"; // 사진이 안 뜰 때(onError) 대신 보여 줄 모양으로 바꿔야 해서 클라이언트 컴포넌트다.

import { teamColor, textColorOn } from "@/lib/teams";
import { useImageFailed } from "@/lib/useImageFailed";

/** 원 지름(px). 24 표·순위 / 28 시즌 1위 / 44 경기 카드 / 56 선수 목록 / 96 선수 페이지 */
export type AvatarSize = 24 | 28 | 44 | 56 | 96;

const INITIAL_TEXT: Record<AvatarSize, string> = {
  24: "text-[0.6875rem]",
  28: "text-xs",
  44: "text-base",
  56: "text-xl",
  96: "text-4xl",
};

interface Props {
  nameKo: string;
  photoUrl: string | null;
  teamAbbr: string | null;
  size: AvatarSize;
  /** 이름이 바로 옆에 있어서 사진을 읽어 줄 필요가 없으면 true. 기본은 96보다 작으면 true */
  decorative?: boolean;
  /** 선수 페이지 머리 카드처럼 색 띠 위에 걸칠 때 흰 테두리를 두른다 */
  ring?: boolean;
}

/**
 * 원형 선수 사진. api가 주는 사진은 배경을 지운 MLB 사진(정사각형)이라,
 * 원 안에 조금 작게 아래쪽에 붙여 얼굴 둘레에 여백을 둔다.
 * 사진이 없거나 안 뜨면 팀 색 원 + 이름 첫 글자로 대신한다.
 */
export default function PlayerAvatar({
  nameKo,
  photoUrl,
  teamAbbr,
  size,
  decorative = size < 96,
  ring = false,
}: Props) {
  const { failed, ref, onError } = useImageFailed(photoUrl);
  // 크기를 고정해 두면 사진이 늦게 떠도 레이아웃이 흔들리지 않는다.
  const box = { width: size, height: size };
  const ringClass = ring ? "border-4 border-surface shadow-[0_1px_4px_rgb(0_0_0/0.14)]" : "";

  if (!photoUrl || failed) {
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

  return (
    <span
      className={`inline-block shrink-0 overflow-hidden rounded-full bg-avatar-bg ${ringClass}`}
      style={box}
    >
      {/* 사진은 우리가 호스팅한다(/photos/…, api가 원본을 한 번 받아 저장). 크기를 고정한 작은 사진이라 next/image는 쓰지 않는다. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- 우리가 호스팅하는 작은 사진 */}
      <img
        ref={ref}
        src={photoUrl}
        alt={decorative ? "" : `${nameKo} 사진`}
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={onError}
        className="block size-full object-contain object-bottom pl-[8%] pr-[8%] pt-[12%]"
      />
    </span>
  );
}
