import InfoTip from "@/components/InfoTip";

/**
 * '평균보다 12% 잘 침' 풀이 ⓘ. 화면에는 지표 이름(wRC+·ERA+)을 쓰지 않고 여기에만 둔다(사용자 11-21).
 * 성적표(홈)·내 선수·선수 탭이 같은 풀이를 쓴다
 */
export default function LeagueInfo({ title, className }: { title: string; className?: string }) {
  return (
    <InfoTip
      title={title}
      className={className}
      lines={[
        "'평균보다 12% 잘 침'은 리그 평균 타자를 100으로 놓고 견준 값(wRC+ 112)이에요. 안타뿐 아니라 볼넷과 장타까지 점수에 얼마나 보탰는지 담았어요.",
        "투수는 같은 방식으로 평균자책점을 리그 평균과 견줘요(ERA+ 112 = 평균보다 12% 잘 막음).",
        "95~104는 평균과 비슷하다고 봐요. 마이너 시즌 기록은 그 단계 리그 평균과 견주고, 내 선수 최근 기록은 메이저만 견줘요.",
      ]}
    />
  );
}
