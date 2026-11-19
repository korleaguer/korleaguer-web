"use client"; // 누르는 즉시 별 모양을 바꾸고 서버 함수를 불러야 해서 클라이언트 컴포넌트다.

import StarIcon from "./StarIcon";
import { useMyPlayerToggle } from "./useMyPlayerToggle";

interface Props {
  playerId: number;
  nameKo: string;
  /** 지금 내 선수인지(쿠키 기준) */
  initialOn: boolean;
  /** pill: 별 + "내 선수" 글씨(선수 페이지), icon: 둥근 별 버튼(카드 구석) */
  variant: "pill" | "icon";
  className?: string;
}

/**
 * 내 선수 넣기·빼기 별표 버튼. 둥근 별(icon)은 보이는 글자가 없어 이름을 바꾸지 않는 켜고 끄는 버튼으로 "이정후 내 선수, 누름"처럼 읽는다.
 * 알약(pill)은 이름이 보이는 글자로 시작한다(WCAG 2.5.3, 11-17 전수조사): 음성 조작으로 보이는 글자를 말하면 눌려야 하는데,
 * 예전 이름 "이정후 내 선수"에는 '내 선수에 넣기'가 없었다. 보이는 글자가 상태마다 달라 이름도 바뀌므로 aria-pressed 없는
 * 보통 버튼이고, 이름은 누르면 할 일이다: 꺼지면 "내 선수에 넣기, 이정후", 켜지면 "내 선수에서 빼기, 이정후".
 * 이름이 바뀌는 버튼에 aria-pressed까지 두면 "내 선수, 이정후, 누름"처럼 상태를 두 번 말하고, 켜고 끌 때 다른 버튼처럼 들린다
 * (WAI-ARIA APG 버튼: 켜고 끄는 버튼은 이름을 바꾸지 않는다, PR #291 리뷰)
 */
export default function MyPlayerToggle({ playerId, nameKo, initialOn, variant, className = "" }: Props) {
  const { on, pending, toggle } = useMyPlayerToggle(playerId, initialOn, nameKo);
  const label = `${nameKo} 내 선수`;
  const pillText = on ? "내 선수" : "내 선수에 넣기";
  const pillAction = on ? "내 선수에서 빼기" : "내 선수에 넣기";

  if (variant === "icon") {
    return (
      <span className={`inline-flex flex-col items-end ${className}`}>
        {/* data-my-toggle: 내 선수 화면이 카드 별로 뺐는지 알아보는 표시(useFocusAfterRemove) */}
        <button
          type="button"
          aria-pressed={on}
          aria-label={label}
          title={on ? "내 선수에서 빼기" : "내 선수에 넣기"}
          data-my-toggle
          onClick={toggle}
          className={`press tap-target grid size-9 place-items-center rounded-full transition duration-150 ${on ? "text-accent-ink hover:bg-accent-soft" : "text-muted hover:bg-surface-2 hover:text-foreground"} ${pending ? "opacity-70" : ""}`}
        >
          <StarIcon filled={on} className="size-5" />
        </button>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        aria-label={`${pillAction}, ${nameKo}`}
        onClick={toggle}
        className={`press tap-target inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-label transition duration-150 ${on ? "bg-accent-soft text-accent-ink" : "bg-surface-2 text-neutral-pill-fg hover:text-foreground"} ${pending ? "opacity-70" : ""}`}
      >
        <StarIcon filled={on} className="size-4" />
        <span aria-hidden>{pillText}</span>
      </button>
    </span>
  );
}
