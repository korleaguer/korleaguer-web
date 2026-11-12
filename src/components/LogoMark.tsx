import { LOGO_BALL, LOGO_BG_FROM, LOGO_BG_TO, LOGO_TAIL, LOGO_TAIL_FROM, LOGO_TAIL_TO } from "@/lib/logo";

/**
 * 머리글의 로고 상자: 파랑 그러데이션 둥근 상자에 쏘아 올린 흰 공(혜성 공). 크기는 className으로 정한다.
 * 모서리는 26px 상자에서 8px(DESIGN.md '로고 상자')과 같은 비율이다.
 * 그라데이션 id가 여러 개 겹쳐도 내용이 같아서 어느 것을 가리켜도 같은 그림이 된다.
 */
export default function LogoMark({ className }: { className?: string }) {
  const b = LOGO_BALL;
  return (
    <svg aria-hidden viewBox="0 0 100 100" className={className}>
      <defs>
        <linearGradient id="kl-logo-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={LOGO_BG_FROM} />
          <stop offset="1" stopColor={LOGO_BG_TO} />
        </linearGradient>
        <linearGradient
          id="kl-logo-tail"
          x1={LOGO_TAIL_FROM.x}
          y1={LOGO_TAIL_FROM.y}
          x2={LOGO_TAIL_TO.x}
          y2={LOGO_TAIL_TO.y}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fff" stopOpacity={0.95} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx={(8 / 26) * 100} fill="url(#kl-logo-bg)" />
      <path d={LOGO_TAIL} fill="url(#kl-logo-tail)" />
      <circle cx={b.cx} cy={b.cy} r={b.r} fill="#fff" />
    </svg>
  );
}
