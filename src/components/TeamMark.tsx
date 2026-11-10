"use client"; // 로고가 안 뜰 때(onError) 색 점으로 바꿔야 해서 클라이언트 컴포넌트다.

import { useImageFailed } from "@/lib/useImageFailed";

export type TeamMarkSize = "sm" | "md";

// 칸 크기를 고정해 두면 로고가 늦게 떠도 글자가 밀리지 않는다. px는 로고 그림 크기.
const SIZES: Record<TeamMarkSize, { box: string; px: number }> = {
  sm: { box: "size-[18px]", px: 16 }, // 글줄 안
  md: { box: "size-6", px: 22 }, // 경기 카드 점수 띠
};

interface Props {
  /** 없으면(모르는 팀, 로고 꺼짐) 색 점을 보여 준다 */
  logoUrl: string | null;
  color: string;
  size: TeamMarkSize;
}

/**
 * 팀 로고. 밝은 모드는 로고만, 다크 모드는 흰 둥근 칸 안에 넣는다(어두운 팀 로고가 바탕에 묻히지 않게).
 * 로고가 없거나 안 뜨면 팀 색 점. 옆에 팀 이름이 있으니 화면 낭독기는 건너뛴다.
 */
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

  const { box, px } = SIZES[size];
  return (
    <span
      aria-hidden
      className={`inline-flex ${box} shrink-0 items-center justify-center rounded-md dark:bg-white dark:p-0.5`}
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
        className="size-full object-contain"
      />
    </span>
  );
}
