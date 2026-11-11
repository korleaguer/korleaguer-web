"use client"; // 사진이 안 뜰 때(onError) 선수 사진으로 바꿔야 해서 클라이언트 컴포넌트다.

import { useImageFailed } from "@/lib/useImageFailed";

/**
 * 기사 사진. 모든 기사에 사진을 붙인다(사용자 11-11: "글만 있으니 눈이 피로하다, 무조건 사진").
 * 기사 대표 사진(언론사 서버에서 브라우저가 직접 받는다)이 없거나 안 뜨면 그 기사의 선수 사진(우리가 호스팅)으로 바꾼다.
 * 선수 사진은 증명사진이라 얼굴이 보이게 위쪽에 맞춘다. 둘 다 안 뜨면 자리를 남기지 않는다.
 */
export default function NewsThumb({ url, fallback }: { url: string | null; fallback: string | null }) {
  const article = useImageFailed(url);
  const player = useImageFailed(fallback);
  const usePlayer = !url || article.failed;
  const src = usePlayer ? fallback : url;
  if (!src || (usePlayer && player.failed)) return null;
  const { ref, onError } = usePlayer ? player : article;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 언론사 사진 원본 주소(우리 서버를 거치지 않음) 또는 우리 선수 사진
    <img
      key={src}
      ref={ref}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={onError}
      className={`h-[66px] w-[88px] shrink-0 rounded-xl bg-background object-cover ${usePlayer ? "object-[50%_20%]" : ""}`}
    />
  );
}
