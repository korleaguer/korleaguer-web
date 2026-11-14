"use client"; // 사진이 안 뜰 때(onError) 이름 원으로 바꿔야 해서 클라이언트 컴포넌트다.

import { useImageFailed } from "@/lib/useImageFailed";

/** 동그라미 안에 쓸 이름 두 글자(이정후 → 정후). 두 글자 이름은 그대로 */
export function shortName(nameKo: string): string {
  return nameKo.length <= 2 ? nameKo : nameKo.slice(-2);
}

/**
 * MLB 도전 카드의 얼굴 동그라미: 포스팅으로 계약한 선수(지난 선수는 계약 구단 시절 MLB 사진의 흰 바탕 편집본,
 * 올해 계약한 선수는 KBO 공식 사진)와 포스팅 중인 선수('지금').
 * 테두리는 모두 같은 얇은 선(.face-edge, 이슈 #105). 구단 색으로 구분하지 않는다.
 * 그래프에서 얼굴끼리 겹칠 때 떨어져 보이게 바깥에 카드 색 2px을 두르고, '지금'(now)은 그 바깥에 파랑을 한 겹 더 두른다.
 * 사진이 없거나 안 뜨면 회색 원 + 이름 두 글자.
 */
export function PostingDot({
  nameKo,
  photoUrl,
  size,
  now = false,
}: {
  nameKo: string;
  photoUrl: string | null;
  size: number;
  now?: boolean;
}) {
  const { failed, ref, onError } = useImageFailed(photoUrl);
  const ring = now ? "0 0 0 2px var(--surface), 0 0 0 4px var(--accent)" : "0 0 0 2px var(--surface)";
  return (
    <span
      aria-hidden
      className="face-edge grid shrink-0 place-items-center overflow-hidden rounded-full bg-avatar-bg font-bold leading-none tracking-[-0.04em] text-muted"
      // eslint-disable-next-line no-restricted-syntax -- 사진 원 크기에 맞춘 이름 두 글자(그림 글자)
      style={{ width: size, height: size, boxShadow: ring, fontSize: Math.round(size * 0.34) }}
    >
      {photoUrl && !failed ? (
        // 지난 선수 사진(/photos/posting-…)은 api가 배경을 지워 흰 바탕에 놓고 얼굴 크기·위치를 KBO 사진(노시환)과
        // 맞춘 정사각형 편집본이다. 그래서 KBO 사진과 똑같이 원을 채우고 위쪽에 맞추면 얼굴 크기와 배경이 같아진다.
        // eslint-disable-next-line @next/next/no-img-element -- 우리 서버가 호스팅하는 선수 사진, 크기 고정
        <img ref={ref} src={photoUrl} alt="" onError={onError} className="size-full object-cover object-top" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        shortName(nameKo)
      )}
    </span>
  );
}
