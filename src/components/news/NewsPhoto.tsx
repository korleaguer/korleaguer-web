"use client"; // 사진이 안 뜰 때(onError) 선수 사진으로 바꿔야 해서 클라이언트 컴포넌트다.

import { useImageFailed } from "@/lib/useImageFailed";

/**
 * 기사 페이지 제목·출처 줄 아래, 카드 안쪽에 둥글게 들어가는 사진(2:1, 휴대폰 첫 화면에 요약이 들어오게 16:9에서 낮췄다). 기사 대표 사진은 언론사 서버에서 브라우저가 직접 받는다.
 * 없거나 안 뜨면 그 기사의 선수 사진(우리가 호스팅)을 낮은 회색 띠 가운데에 보인다. 선수 사진은 작은 증명사진
 * (KBO 등록 사진은 가로 100px 안팎)이라 잘라 키우면 흐려서, 원래 크기를 넘겨 늘리지 않는다.
 * 둘 다 안 뜨면 자리(위 여백 포함)를 남기지 않는다. 사진 설명 줄은 달지 않는다: 바로 위 출처 줄에 언론사가 있다.
 */
export default function NewsPhoto({ url, fallback }: { url: string | null; fallback: string | null }) {
  const article = useImageFailed(url);
  const player = useImageFailed(fallback);
  const usePlayer = !url || article.failed;
  const src = usePlayer ? fallback : url;
  if (!src || (usePlayer && player.failed)) return null;
  const { ref, onError } = usePlayer ? player : article;
  return (
    // 기사 사진은 2:1(휴대폰 343px 폭이면 172px). 640px 이상(PC 왼쪽 칸 폭 628px이면 16:9가 353px)은 높이를 288px로 정해 요약이 첫 화면에 들어오게 한다.
    // max-height로 누르면 비율 때문에 폭까지 줄어 사진이 왼쪽에 쏠린다(aspect-ratio가 최대 높이를 최대 폭으로 옮긴다)
    <div
      className={`mt-3 overflow-hidden rounded-xl bg-surface-2 ${usePlayer ? "h-36 py-4 sm:h-44" : "aspect-[2/1] sm:aspect-auto sm:h-72"}`}
    >
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
  );
}
