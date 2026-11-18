import { useId } from "react";
import { LOGO_BASE_RADIUS, LOGO_BASE_SIDE, LOGO_BASES, LOGO_BG_FROM, LOGO_BG_TO } from "@/lib/logo";

/**
 * 머리글의 로고 상자 '만루': 파랑 둥근 상자에 1·2·3루가 모두 켜진 주자 표시. 크기는 className으로 정한다.
 * 모서리는 26px 상자에서 8px(DESIGN.md '로고 상자')과 같은 비율이다.
 * 파랑은 밝은·어두운 머리글 모두에서 또렷해서 테두리를 따로 두지 않는다.
 * 그라데이션 id는 그릴 때마다 따로 만든다(useId는 서버 컴포넌트에서도 된다). 머리글은 로고를 브라우저용 홈 링크와 앱용 글자 로고에
 * 두 번 그린다. id가 하나로 같으면 url(#…)이 문서에서 첫째인 링크 안 그라데이션을 가리키는데, 앱 안에서는 그 링크가 display:none이라
 * 그라데이션이 그려지지 않았다. 그래서 보이는 둘째 로고의 파란 상자가 비고 흰 마름모만 흰 머리글 위에 남았다(Chromium에서 확인, 검토).
 * 앞에 'kl-logo'를 붙이는 것은 서버 컴포넌트의 useId가 요청마다 처음부터 세기 때문이다. 화면을 옮길 때 따로 그린 다른 서버 컴포넌트의
 * id와 겹치지 않게 한다(머리글은 처음 그린 그대로 남는다).
 */
export default function LogoMark({ className }: { className?: string }) {
  const s = LOGO_BASE_SIDE;
  const gradientId = `kl-logo${useId()}`;
  return (
    <svg aria-hidden viewBox="0 0 100 100" className={className}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={LOGO_BG_FROM} />
          <stop offset="1" stopColor={LOGO_BG_TO} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx={(8 / 26) * 100} fill={`url(#${gradientId})`} />
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
