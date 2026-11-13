"use client"; // 사진이 안 뜰 때(onError) 다음 사진으로 바꿔야 해서 클라이언트 컴포넌트다.

import { useImageFailed } from "@/lib/useImageFailed";

/**
 * 기사 제목 목록의 썸네일(88×66, 4:3). 모든 기사에 사진을 붙인다(사용자 11-11: "글만 있으니 눈이 피로하다, 무조건 사진",
 * 11-12: "썸네일 있던 거 사라졌어? 다시 넣어").
 * 사진은 이 순서로 보인다: ① 우리 서버가 썸네일 크기로 줄인 기사 사진(/news/{번호}/photo/264x198, 원본과 화질은 같고 훨씬 가볍다)
 * → ② 그게 안 되면 언론사 원본 → ③ 원본도 없거나 안 뜨면 그 기사의 선수 사진(우리가 호스팅). 셋 다 안 뜨면 자리를 남기지 않는다.
 * 선수 사진은 증명사진이라 얼굴이 보이게 위쪽에 맞춘다.
 */
export default function NewsThumb({
  newsId = null,
  url,
  fallback,
}: {
  /** 우리 기사 번호. 없으면(옛 api·바깥 기사) 줄인 사진 없이 원본부터 */
  newsId?: number | null;
  url: string | null;
  fallback: string | null;
}) {
  // 썸네일 칸(88×66)과 같은 4:3으로 자른 2배·3배 화면용. 화면 배율에 맞는 것을 브라우저가 고른다
  const small = newsId != null && url ? `/news/${newsId}/photo/264x198` : null;
  const smallSet = newsId != null && url ? `/news/${newsId}/photo/176x132 2x, /news/${newsId}/photo/264x198 3x` : undefined;
  const smallState = useImageFailed(small);
  const original = useImageFailed(url);
  const player = useImageFailed(fallback);
  // 0: 줄인 사진, 1: 원본, 2: 선수 사진, -1: 없음
  const stage = small && !smallState.failed ? 0 : url && !original.failed ? 1 : fallback && !player.failed ? 2 : -1;
  if (stage < 0) return null;
  const src = stage === 0 ? small : stage === 1 ? url : fallback;
  const { ref, onError } = stage === 0 ? smallState : stage === 1 ? original : player;
  const isPlayer = stage === 2;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 우리 서버가 줄인 기사 사진, 언론사 원본 또는 우리 선수 사진
    <img
      key={src}
      ref={ref}
      src={src ?? undefined}
      srcSet={stage === 0 ? smallSet : undefined}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={onError}
      className={`h-[66px] w-[88px] shrink-0 rounded-xl bg-surface-2 object-cover ${isPlayer ? "object-[50%_20%]" : ""}`}
    />
  );
}
