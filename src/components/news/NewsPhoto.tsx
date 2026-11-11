"use client"; // 사진이 안 뜰 때(onError) 선수 사진으로 바꿔야 해서 클라이언트 컴포넌트다.

import { useImageFailed } from "@/lib/useImageFailed";

/**
 * 기사 페이지 맨 위 큰 사진(16:9). 기사 대표 사진은 언론사 서버에서 브라우저가 직접 받는다.
 * 없거나 안 뜨면 그 기사의 선수 사진(우리가 호스팅)을 낮은 회색 띠 가운데에 보인다. 선수 사진은 작은 증명사진
 * (KBO 등록 사진은 가로 100px 안팎)이라 잘라 키우면 흐려서, 원래 크기를 넘겨 늘리지 않는다.
 * 둘 다 안 뜨면 자리를 남기지 않는다. 기사 사진일 때만 아래에 출처(언론사)를 단다.
 */
export default function NewsPhoto({
  url,
  fallback,
  credit,
}: {
  url: string | null;
  fallback: string | null;
  credit: string;
}) {
  const article = useImageFailed(url);
  const player = useImageFailed(fallback);
  const usePlayer = !url || article.failed;
  const src = usePlayer ? fallback : url;
  if (!src || (usePlayer && player.failed)) return null;
  const { ref, onError } = usePlayer ? player : article;
  return (
    <figure>
      <div className={`overflow-hidden bg-surface-2 ${usePlayer ? "h-36 py-4 sm:h-44" : "aspect-video"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- 언론사 사진 원본 주소(우리 서버를 거치지 않음) 또는 우리 선수 사진 */}
        <img
          key={src}
          ref={ref}
          src={src}
          alt=""
          decoding="async"
          referrerPolicy="no-referrer"
          onError={onError}
          // 기사 사진은 세로로 긴 인물 사진이 많아, 가운데 대신 위쪽(20%)에 맞춰 잘라 얼굴이 남게 한다.
          // 선수 사진은 띠 높이에 맞추되 원래 크기보다 키우지 않는다(scale-down)
          className={`size-full ${usePlayer ? "object-scale-down" : "object-cover object-[50%_20%]"}`}
        />
      </div>
      {!usePlayer && (
        <figcaption className="px-4 pt-1.5 text-right text-[0.6875rem] text-muted sm:px-5">사진: {credit}</figcaption>
      )}
    </figure>
  );
}
