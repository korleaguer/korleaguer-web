"use client"; // 사진이 안 뜰 때(onError) 이름 원으로 바꿔야 해서 클라이언트 컴포넌트다.

import { useImageFailed } from "@/lib/useImageFailed";

/**
 * KBO 선수 원형 사진(포스팅 선수). 사진은 현 소속 구단 공식 사진이라 배경이 있어, 원을 꽉 채우고 얼굴이 보이게 위쪽에 맞춘다.
 * 테두리는 MLB 도전 카드의 다른 얼굴과 같은 얇은 선(.face-edge, 이슈 #105). 구단 색 테두리는 두지 않는다.
 * 사진이 없거나 안 뜨면 회색 원 + 이름 첫 글자. size는 지름(px), 기본 52.
 */
export default function KboAvatar({ nameKo, photoUrl, size = 52 }: { nameKo: string; photoUrl: string | null; size?: number }) {
  const { failed, ref, onError } = useImageFailed(photoUrl);
  return (
    <div
      aria-hidden
      className="face-edge grid shrink-0 place-items-center overflow-hidden rounded-full bg-avatar-bg font-extrabold text-muted"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.37) }}
    >
      {photoUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- 외부 구단 사진, 크기 고정
        <img ref={ref} src={photoUrl} alt="" onError={onError} className="size-full object-cover object-top" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        nameKo.slice(0, 1)
      )}
    </div>
  );
}
