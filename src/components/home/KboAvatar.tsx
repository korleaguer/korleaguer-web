"use client"; // 사진이 안 뜰 때(onError) 이름 원으로 바꿔야 해서 클라이언트 컴포넌트다.

import { smallPhoto } from "@/lib/photo";
import { useImageFailed } from "@/lib/useImageFailed";

/**
 * KBO 선수 원형 사진(포스팅 선수). 사진은 현 소속 구단 공식 사진이라 배경이 있어, 원을 꽉 채우고 얼굴이 보이게 위쪽에 맞춘다.
 * 테두리는 MLB 도전 카드의 다른 얼굴과 같은 얇은 선(.face-edge, 이슈 #105). 구단 색 테두리는 두지 않는다.
 * 사진이 없거나 안 뜨면 회색 원 + 이름 첫 글자. size는 지름(px), 기본 52.
 * eager: 첫 화면 안 사진(비시즌 홈 맨 위 MLB 도전 카드 머리)은 바로 받는다. lazy면 화면 배치를 마친 뒤에야 받기 시작해
 * 첫 화면 사진이 늦게 뜬다(web.dev 'lazy loading', 이슈 #277). 그 밖(뉴스 선수 고르기 등)은 lazy 그대로
 * fetchPriority: 첫 화면에서 가장 큰 사진(MLB 도전 카드 76px 머리)은 "high"로 다른 사진보다 먼저 받는다(전수조사 L270)
 */
export default function KboAvatar({
  nameKo,
  photoUrl,
  size = 52,
  eager = false,
  fetchPriority,
}: {
  nameKo: string;
  photoUrl: string | null;
  size?: number;
  eager?: boolean;
  fetchPriority?: "high" | "low";
}) {
  const { failed, ref, onError } = useImageFailed(photoUrl);
  // 56px 이하 원은 화면 배율에 맞춰 줄인 사진(lib/photo, 2배·3배 폭 최대 168px). 지금 KBO 사진 kbo-…은 256px 편집본이라 늘 줄여 받는다.
  // 그보다 큰 원(MLB 도전 카드 76px 머리)은 원본 256px 그대로다
  const small = smallPhoto(photoUrl, size);
  return (
    <div
      aria-hidden
      className="face-edge grid shrink-0 place-items-center overflow-hidden rounded-full bg-avatar-bg font-extrabold text-muted"
      // eslint-disable-next-line no-restricted-syntax -- 사진 원 크기에 맞춘 이니셜(그림 글자)
      style={{ width: size, height: size, fontSize: Math.round(size * 0.37) }}
    >
      {photoUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- 외부 구단 사진, 크기 고정
        <img
          ref={ref}
          src={small?.src ?? photoUrl}
          srcSet={small?.srcSet}
          alt=""
          onError={onError}
          className="size-full object-cover object-top"
          loading={eager ? "eager" : "lazy"}
          fetchPriority={fetchPriority}
          referrerPolicy="no-referrer"
        />
      ) : (
        nameKo.slice(0, 1)
      )}
    </div>
  );
}
