"use client"; // 사진이 안 뜰 때(onError) 자리를 없애야 해서 클라이언트 컴포넌트다.

import { useImageFailed } from "@/lib/useImageFailed";

/** 기사 대표 사진(언론사 서버에서 브라우저가 직접 받는다). 안 뜨면 빈자리를 남기지 않고 없앤다 */
export default function NewsThumb({ url }: { url: string }) {
  const { failed, ref, onError } = useImageFailed(url);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 언론사 사진 원본 주소, 우리 서버를 거치지 않는다
    <img
      ref={ref}
      src={url}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={onError}
      className="h-[60px] w-[90px] shrink-0 rounded-lg bg-background object-cover"
    />
  );
}
