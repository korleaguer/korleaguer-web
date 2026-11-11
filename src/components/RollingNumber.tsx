"use client"; // 처음 그려질 때 화면 밖이었는지 보고, 보일 때 굴리려고 클라이언트 컴포넌트다.

import { type RefObject, useEffect, useRef, type CSSProperties } from "react";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * 굴러 올라가는 숫자. 자리마다 0에서 제 숫자까지 굴러 올라간다(토스 금액처럼, 모양은 globals.css의 .rolling-digit).
 * 숫자가 아닌 글자(. - ⅔ , 같은 것)는 그대로 둔다.
 * - 서버 HTML에도 최종 숫자가 있다. 화면 낭독기와 검색은 숨긴 글자(sr-only)를 읽고, 스크립트가 없어도 최종 숫자가 보인다.
 * - 처음 그려질 때 CSS 애니메이션으로 구른다. 그때 화면 밖이었으면 보일 때까지 기다렸다가 구른다(아래로 내려야 보이는 카드).
 * - 값이 바뀌면(새로 받은 기록) 바뀐 자리만 새 숫자로 굴러간다.
 * - 동작 줄이기 설정이면 굴리지 않는다.
 */
export default function RollingNumber({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useMoveWhenSeen(ref);

  return (
    <span ref={ref}>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="select-none">
        {Array.from(value).map((char, i) =>
          /\d/.test(char) ? (
            <span key={i} className="rolling-digit" style={{ "--d": char, "--i": i } as CSSProperties}>
              <span className="invisible">{char}</span>
              <span className="rolling-strip">
                {DIGITS.map((digit) => (
                  <span key={digit}>{digit}</span>
                ))}
              </span>
            </span>
          ) : (
            <span key={i}>{char}</span>
          ),
        )}
      </span>
    </span>
  );
}

/**
 * 처음 그려질 때 화면 밖이던 요소는 보일 때까지 움직임을 멈춰 둔다(data-roll="wait", globals.css가 그 안의
 * 처음 움직임을 끈다). 화면 안으로 들어오면 표시를 떼어 처음부터 움직인다. 이미 보이던 요소는 그대로 둔다.
 */
export function useMoveWhenSeen(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = ref.current;
    if (!element || inView(element)) return;
    element.dataset.roll = "wait";
    return watch(element);
  }, [ref]);
}

function inView(element: HTMLElement): boolean {
  const { top, bottom } = element.getBoundingClientRect();
  return bottom > 0 && top < window.innerHeight;
}

// 숫자 여럿이 관찰자 하나를 같이 쓴다
let observer: IntersectionObserver | null = null;

/** 화면 안으로 조금 들어오면(아래 10% 띠를 넘으면) 기다림 표시를 떼어 처음부터 굴린다 */
function watch(element: HTMLElement): () => void {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const target = entry.target as HTMLElement;
        delete target.dataset.roll;
        observer?.unobserve(target);
      }
    },
    { rootMargin: "0px 0px -10% 0px" },
  );
  observer.observe(element);
  return () => observer?.unobserve(element);
}
