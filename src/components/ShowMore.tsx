"use client"; // 펼침 상태를 기억하고 버튼으로 바꿔야 해서 클라이언트 컴포넌트다.

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { focusContainer } from "@/lib/focus";

/** 펼친 내용 안에서 포커스를 받을 수 있는 것(링크·버튼·입력칸·tabindex를 준 것) */
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

interface Props {
  /** 접혀 있을 때 버튼 글자. 예: "4건 더 보기" */
  moreLabel: string;
  /** 펼친 뒤 버튼 글자 */
  lessLabel?: string;
  /** 펼치면 버튼 위에 나타날 내용. 서버에서 그린 그대로 받아 접혀 있는 동안 숨겨 둔다 */
  children: ReactNode;
  /** 놓이는 자리에 맞춘 버튼 여백·선 */
  buttonClassName?: string;
  /**
   * true면 내용을 처음 펼칠 때 그린다(그 전에는 서버 HTML에도 없다). 긴 목록을 서버에서 다 그려 보내지 않으려고 쓴다.
   * 한 번 펼친 뒤로는 접어도 그려 둔다. 내용은 브라우저에서 만들어야 하므로 클라이언트 컴포넌트 안에서 넘긴다.
   */
  lazy?: boolean;
}

/**
 * '더 보기' ↔ '접기' 버튼. 펼치면 내용이 버튼 위에 붙고, 버튼은 맨 아래에서 '접기'가 된다.
 * 브라우저 기본 접이식(details)은 펼쳐도 글자가 그대로이고 버튼이 목록 가운데에 남아 접는 법이 보이지 않았다(이슈 #37).
 * 긴 목록을 접으면 버튼이 화면 위로 밀려날 수 있어, 그때는 버튼이 보이는 곳까지만 스크롤한다.
 * 펼치면 새로 나온 첫 줄로 포커스를 옮긴다. 새 줄이 버튼 앞(위)에 생겨서, 버튼에 남은 키보드·화면 낭독기는 다음으로 가면
 * 펼친 줄을 건너뛰고 지나쳤다(전수조사). 줄 안에 누를 것(선수 링크)이 있으면 그 첫 링크, 없으면(이동 기록·경기 기록) 내용 상자.
 * 화면은 움직이지 않는다(새 첫 줄은 버튼이 있던 자리에 나온다). 마우스로 눌렀으면 포커스 테두리도 보이지 않는다.
 */
export default function ShowMore({ moreLabel, lessLabel = "접기", children, buttonClassName = "", lazy = false }: Props) {
  const [open, setOpen] = useState(false);
  // lazy일 때 한 번이라도 펼쳤나(펼친 뒤로는 내용을 계속 그려 둔다)
  const [rendered, setRendered] = useState(!lazy);
  const contentId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // 버튼으로 막 펼쳤나. 펼친 내용이 그려진 뒤(lazy면 처음 그린 뒤) 한 번만 포커스를 옮긴다
  const focusAfterOpen = useRef(false);

  useEffect(() => {
    if (!open || !focusAfterOpen.current) return;
    focusAfterOpen.current = false;
    const box = contentRef.current;
    if (!box) return;
    const first = box.querySelector<HTMLElement>(FOCUSABLE);
    if (first) first.focus({ preventScroll: true });
    else focusContainer(box, { preventScroll: true });
  }, [open, rendered]);

  function toggle() {
    const closing = open;
    setOpen(!closing);
    if (!closing) {
      setRendered(true);
      focusAfterOpen.current = true;
    }
    if (closing) {
      // 접힌 화면이 그려진 뒤 버튼이 화면 밖이면 보이는 곳까지만 옮긴다(이미 보이면 그대로)
      requestAnimationFrame(() => buttonRef.current?.scrollIntoView({ block: "nearest" }));
    }
  }

  return (
    <>
      {/* reveal: 펼칠 때마다(hidden이 풀릴 때) 새로 나온 줄이 살짝 내려오며 나타난다.
          누를 것이 없는 줄(이동 기록 등)을 펼치면 이 상자가 포커스를 받는다. tabIndex는 그때만 붙인다(focusContainer):
          늘 두면 펼친 줄의 글자·빈 곳을 마우스로 누를 때마다 상자가 포커스를 받았다 */}
      <div ref={contentRef} id={contentId} hidden={!open} className="reveal">
        {rendered ? children : null}
      </div>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={toggle}
        className={`press-soft flex min-h-11 w-full cursor-pointer items-center justify-center gap-1 text-label text-accent-ink ${buttonClassName}`}
      >
        {open ? lessLabel : moreLabel}
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`size-3.5 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
    </>
  );
}
