import { useCallback, useState } from "react";

/**
 * <img>가 안 뜬 것을 알아내는 훅. failed가 true면 부르는 쪽이 대신 보여 줄 모양으로 바꾼다.
 * onError만으로는 부족하다. 서버가 그린 HTML의 이미지가 React가 붙기 전에 이미 실패했으면
 * 이벤트를 놓치기 때문에, 붙을 때 이미 끝난(complete) 이미지는 decode()로 한 번 더 확인한다.
 * 실패한 주소를 기억해 두므로, 주소가 바뀌면 다시 시도한다.
 */
export function useImageFailed(url: string | null) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const ref = useCallback(
    (img: HTMLImageElement | null) => {
      if (img?.complete) img.decode().catch(() => setFailedUrl(url));
    },
    [url],
  );

  return {
    failed: url != null && url === failedUrl,
    ref,
    onError: () => setFailedUrl(url),
  };
}
