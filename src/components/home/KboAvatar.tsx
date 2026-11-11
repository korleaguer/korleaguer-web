"use client"; // 사진이 안 뜰 때(onError) 구단 색 원으로 바꿔야 해서 클라이언트 컴포넌트다.

import { useImageFailed } from "@/lib/useImageFailed";

/**
 * KBO 선수 원형 사진(포스팅 선수). 사진은 현 소속 구단 공식 사진이라 배경이 있어, 원을 꽉 채우고 얼굴이 보이게 위쪽에 맞춘다.
 * 사진이 없거나 안 뜨면 구단 색 원 + 이름 첫 글자.
 */
export default function KboAvatar({ nameKo, photoUrl, color }: { nameKo: string; photoUrl: string | null; color: string }) {
  const { failed, ref, onError } = useImageFailed(photoUrl);
  if (!photoUrl || failed) {
    return (
      <div
        aria-hidden
        className="grid size-13 shrink-0 place-items-center rounded-full text-[1.1875rem] font-extrabold text-white"
        style={{ background: color }}
      >
        {nameKo.slice(0, 1)}
      </div>
    );
  }
  return (
    <div aria-hidden className="size-13 shrink-0 overflow-hidden rounded-full bg-avatar-bg" style={{ outline: `2px solid ${color}`, outlineOffset: -2 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 외부 구단 사진, 크기 고정 */}
      <img ref={ref} src={photoUrl} alt="" onError={onError} className="size-full object-cover object-top" loading="lazy" referrerPolicy="no-referrer" />
    </div>
  );
}
