"use client"; // 사진이 안 뜰 때(onError) 대신 보여 줄 모양으로 바꿔야 해서 클라이언트 컴포넌트다.

import { teamColor, textColorOn } from "@/lib/teams";
import { useImageFailed } from "@/lib/useImageFailed";

type Size = "sm" | "md" | "lg";

// 크기를 고정해 두면 사진이 늦게 떠도 레이아웃이 흔들리지 않는다. px는 <img> width/height 속성에 쓴다.
const SIZES: Record<Size, { px: number; box: string; initial: string }> = {
  sm: { px: 28, box: "size-7", initial: "text-xs" }, // 이름 옆
  md: { px: 56, box: "size-14", initial: "text-xl" }, // 카드
  lg: { px: 96, box: "size-24", initial: "text-4xl" }, // 선수 페이지
};

interface Props {
  nameKo: string;
  photoUrl: string | null;
  teamAbbr: string | null;
  size: Size;
  /** 이름이 바로 옆에 있어서 사진을 읽어 줄 필요가 없으면 true. 기본은 작은 크기만 true */
  decorative?: boolean;
}

/** 동그란 선수 사진. 사진이 없거나 안 뜨면 팀 색 동그라미 + 이름 첫 글자로 대신한다. */
export default function PlayerAvatar({
  nameKo,
  photoUrl,
  teamAbbr,
  size,
  decorative = size === "sm",
}: Props) {
  const { failed, ref, onError } = useImageFailed(photoUrl);
  const { px, box, initial } = SIZES[size];

  if (!photoUrl || failed) {
    const color = teamColor(teamAbbr);
    return (
      <span
        aria-hidden
        className={`inline-flex ${box} shrink-0 items-center justify-center rounded-full font-extrabold ${initial}`}
        style={{ backgroundColor: color, color: textColorOn(color) }}
      >
        {nameKo.charAt(0)}
      </span>
    );
  }

  return (
    // 브라우저가 MLB 이미지 서버에서 직접 받게 한다. next/image를 쓰면 우리 서버가 이미지를 대신 받아 오게 된다.
    // eslint-disable-next-line @next/next/no-img-element -- 우리 서버를 거치지 않고 브라우저가 직접 받는다
    <img
      ref={ref}
      src={photoUrl}
      alt={decorative ? "" : `${nameKo} 사진`}
      width={px}
      height={px}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={onError}
      className={`${box} shrink-0 rounded-full bg-surface-2 object-cover object-top`}
    />
  );
}
