// 클라이언트 컴포넌트에서만 쓴다(처음 그려질 때 화면 밖이었는지 브라우저에서 본다).

import { type RefObject, useEffect } from "react";

/**
 * 처음 그려질 때 화면 밖이던 요소는 보일 때까지 움직임을 멈춰 둔다(data-motion="wait", globals.css가 그 안의
 * 처음 움직임을 끈다). 화면 안으로 들어오면 표시를 떼어 처음부터 움직인다. 이미 보이던 요소는 그대로 둔다.
 * 아래로 내려야 보이는 그래프(MLB 도전 카드)가 보이기 전에 다 차올라 버리지 않게 쓴다.
 */
export function useMoveWhenSeen(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = ref.current;
    if (!element || inView(element)) return;
    element.dataset.motion = "wait";
    return watch(element);
  }, [ref]);
}

function inView(element: HTMLElement): boolean {
  const { top, bottom } = element.getBoundingClientRect();
  return bottom > 0 && top < window.innerHeight;
}

// 여러 요소가 관찰자 하나를 같이 쓴다
let observer: IntersectionObserver | null = null;

/** 화면 안으로 조금 들어오면(아래 10% 띠를 넘으면) 기다림 표시를 떼어 처음부터 움직인다 */
function watch(element: HTMLElement): () => void {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const target = entry.target as HTMLElement;
        delete target.dataset.motion;
        observer?.unobserve(target);
      }
    },
    { rootMargin: "0px 0px -10% 0px" },
  );
  observer.observe(element);
  return () => observer?.unobserve(element);
}
