"use client"; // 로고가 안 뜰 때(onError) 색 점으로 바꿔야 해서 클라이언트 컴포넌트다.

import { useImageFailed } from "@/lib/useImageFailed";

export type TeamMarkSize = "sm" | "md";

// 칩 크기를 고정해 두면 로고가 늦게 떠도 글자가 밀리지 않는다.
const SIZES: Record<TeamMarkSize, { chip: string; px: number }> = {
  sm: { chip: "size-5", px: 16 },
  md: { chip: "size-6", px: 20 },
};

interface Props {
  /** 없으면(모르는 팀, 로고 꺼짐) 색 점을 보여 준다 */
  logoUrl: string | null;
  color: string;
  size: TeamMarkSize;
}

/** 팀 로고(흰 바탕 둥근 칩 안). 로고가 없거나 안 뜨면 팀 색 점. 옆에 팀 이름이 있으니 화면 낭독기는 건너뛴다. */
export default function TeamMark({ logoUrl, color, size }: Props) {
  const { failed, ref, onError } = useImageFailed(logoUrl);

  if (!logoUrl || failed) {
    return (
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/30"
        style={{ backgroundColor: color }}
      />
    );
  }

  const { chip, px } = SIZES[size];
  return (
    // 흰 바탕 칩: 다크 모드에서도 로고가 보이게 한다.
    <span
      aria-hidden
      className={`inline-flex ${chip} shrink-0 items-center justify-center rounded-md bg-white ring-1 ring-black/10 dark:ring-white/30`}
    >
      {/* 브라우저가 MLB 이미지 서버에서 직접 받게 <img>를 쓴다(next/image는 우리 서버가 대신 받아 온다). */}
      {/* eslint-disable-next-line @next/next/no-img-element -- 우리 서버를 거치지 않고 브라우저가 직접 받는다 */}
      <img
        ref={ref}
        src={logoUrl}
        alt=""
        width={px}
        height={px}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={onError}
        className="object-contain"
      />
    </span>
  );
}
