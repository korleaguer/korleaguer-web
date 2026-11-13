import { Suspense, ViewTransition, type ReactNode } from "react";

/**
 * 화면 내용을 받는 동안 회색 뼈대를 보이고, 내용이 오면 뼈대는 흐려지며 빠지고 내용은 살짝 떠오르며 들어온다.
 * 브라우저 화면 전환 기능(View Transitions)으로 움직이고, 모르는 브라우저는 그냥 바뀐다. '동작 줄이기'면 움직이지 않는다(globals.css).
 * default="none": 다른 전환(주소만 바뀌는 기간 고르기 등)에서는 움직이지 않는다.
 */
export default function PageSuspense({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <ViewTransition exit="skeleton-out" default="none">
          {fallback}
        </ViewTransition>
      }
    >
      <ViewTransition enter="content-in" default="none">
        {children}
      </ViewTransition>
    </Suspense>
  );
}
