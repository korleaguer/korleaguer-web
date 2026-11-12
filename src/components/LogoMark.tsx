import { LOGO_BASE_RADIUS, LOGO_BASE_SIDE, LOGO_BASES, LOGO_BG_FROM, LOGO_BG_TO } from "@/lib/logo";

/**
 * 머리글의 로고 상자 '만루': 파랑 둥근 상자에 1·2·3루가 모두 켜진 주자 표시. 크기는 className으로 정한다.
 * 모서리는 26px 상자에서 8px(DESIGN.md '로고 상자')과 같은 비율이다.
 * 파랑은 밝은·어두운 머리글 모두에서 또렷해서 테두리를 따로 두지 않는다.
 * 그라데이션 id가 여러 개 겹쳐도 내용이 같아서 어느 것을 가리켜도 같은 그림이 된다.
 */
export default function LogoMark({ className }: { className?: string }) {
  const s = LOGO_BASE_SIDE;
  return (
    <svg aria-hidden viewBox="0 0 100 100" className={className}>
      <defs>
        <linearGradient id="kl-logo-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={LOGO_BG_FROM} />
          <stop offset="1" stopColor={LOGO_BG_TO} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx={(8 / 26) * 100} fill="url(#kl-logo-bg)" />
      {LOGO_BASES.map((b) => (
        <rect
          key={`${b.x}-${b.y}`}
          x={b.x - s / 2}
          y={b.y - s / 2}
          width={s}
          height={s}
          rx={LOGO_BASE_RADIUS}
          transform={`rotate(45 ${b.x} ${b.y})`}
          fill="#fff"
        />
      ))}
    </svg>
  );
}
