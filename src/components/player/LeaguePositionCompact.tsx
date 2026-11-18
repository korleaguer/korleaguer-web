import type { CSSProperties } from "react";
import type { PlayerSaber } from "@/lib/api";
import { formatInningsOuts } from "@/lib/format";
import { type Row, rowsOf, STEADY_OUTS, STEADY_PA } from "@/components/player/LeaguePosition";

/** 서버가 위치를 매기는 최소 표본(타자 50타석, 투수 10이닝 = 30아웃). 이보다 적으면 percentiles가 null이다 */
const MIN_PA = 50;
const MIN_OUTS = 30;

/**
 * 홈 시즌 성적표 펼친 곳의 'MLB 안 위치' 작은 판(이슈 #276, 사용자가 고른 '목록 + 누르면 펼치기' 그림).
 * 막대 규칙은 선수 화면 'MLB 타자(투수) 중에서'(LeaguePosition)와 같고, 판정 글자가 시즌 전체를 이미 말해서 '종합'은 빼고
 * 세 줄만 둔다(타자 타격·주루·수비, 투수 실점 억제·삼진·볼넷). 실제 값 줄과 각주는 선수 화면에 맡긴다.
 * - 머리: 'MLB 타자 465명 중'. 목록 줄 숫자가 마이너 합계면(minorNumbers) 위치가 메이저 몇 타석으로 잰 것인지 붙인다
 *   (김혜성처럼 트리플A 숫자 옆에서 MLB 위치가 같은 표본으로 읽히지 않게). 표본이 적으면(100타석·30이닝 미만) '참고용'.
 * - 위치가 없으면(서버 기준 50타석·10이닝 미만, 메이저 기록 없음) 한 줄로 그렇다고만 쓴다. 위 한 줄 흐름이 이미 메이저 경기
 *   수를 말했으면(sampleSaid) 그 줄도 쓰지 않는다.
 * 선수 화면 칸은 캐시하는 async 부품이고 그 화면의 줄 모양을 따로 고치는 작업이 있어서, 홈 목록이 바로 그리는 이 판은 파일을 나눈다.
 */
export default function LeaguePositionCompact({
  saber,
  pitcher,
  minorNumbers,
  sampleSaid = false,
}: {
  /** null이면 그 시즌 메이저 기록이 없다 */
  saber: PlayerSaber | null;
  pitcher: boolean;
  minorNumbers: boolean;
  /** 위에서 이미 메이저 경기 수를 말했으면(한 줄 흐름) 표본이 적어 위치가 없다는 줄을 쓰지 않는다 */
  sampleSaid?: boolean;
}) {
  const hitter = saber ? saber.kind === "hitter" : !pitcher;
  const who = hitter ? "타자" : "투수";
  const count = !saber ? 0 : saber.kind === "hitter" ? (saber.plateAppearances ?? 0) : (saber.inningsOuts ?? 0);
  const sample = hitter ? `${count}타석` : `${formatInningsOuts(count)}이닝`;
  const rows = saber ? rowsOf(saber)?.slice(1) : null;

  if (!saber || !rows) {
    // 표본이 넉넉한데 위치가 없으면(견줄 선수가 아직 없는 등) 이유를 지어내지 않고 아무것도 쓰지 않는다.
    // 메이저에서 조금 뛴 것을 위 한 줄이 이미 말했으면 같은 말이라 쓰지 않는다(고우석 '메이저 4경기' · '메이저 4이닝뿐이라 …')
    if (count >= (hitter ? MIN_PA : MIN_OUTS) || (count > 0 && sampleSaid)) return null;
    return (
      <p className="mt-3 text-meta text-muted">
        {count > 0 ? `메이저 ${sample}뿐이라 MLB ${who} 중 위치는 없어요` : `메이저 기록이 없어 MLB ${who} 중 위치는 없어요`}
      </p>
    );
  }

  const steady = count >= (hitter ? STEADY_PA : STEADY_OUTS);
  const head = [
    saber.poolSize > 0 ? `MLB ${who} ${saber.poolSize}명 중` : `MLB ${who} 중`,
    minorNumbers || !steady ? `메이저 ${sample}${steady ? "" : "뿐이라 참고용"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    // 칸이 13rem보다 좁으면(앱 큰 글씨 2배 휴대폰) 이름·순위를 한 줄 양 끝에, 막대를 그 아래 줄 전체에 둔다.
    // 이름 칸·순위 칸이 rem이라 한 줄에 두면 막대 칸이 0으로 찌그러진다. 보통 크기에서는 가장 좁은 320px 휴대폰도 16rem 넘게 남는다
    <div className="@container mt-3">
      <p className="mb-2 text-caption text-muted tabular-nums">{head}</p>
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <CompactRow key={r.label} row={r} who={who} labelCol={hitter ? "2.5rem" : "4rem"} />
        ))}
      </ul>
    </div>
  );
}

/** 작은 판 한 줄: 이름 | 막대(가운데 선 = MLB 중간) | 순위(선수 화면 줄보다 글자·막대가 한 단계 작다) */
function CompactRow({ row, who, labelCol }: { row: Row; who: string; labelCol: string }) {
  const { label, pct } = row;
  const top = pct != null && pct >= 50;
  // 가운데 선은 MLB 중간(중앙값)이라 그 아래는 '평균 아래'가 아니라 '중간 아래'다(사용자가 고른 그림, 전수조사 '중간 아래로 맞추기').
  // 순위 대신 회색 글자로 둬서 혹평처럼 읽히지 않게 한다
  const verdict = pct == null ? "비교 전" : top ? `상위 ${100 - pct}%` : "중간 아래";
  return (
    <li
      className="grid grid-cols-[var(--label-col)_minmax(0,1fr)_4.25rem] items-center gap-x-2.5 @max-[13rem]:grid-cols-[minmax(0,1fr)_auto] @max-[13rem]:gap-y-1"
      style={{ "--label-col": labelCol } as CSSProperties}
    >
      <span className="text-meta">{label}</span>
      <div aria-hidden className="relative h-1.5 rounded-full bg-surface-2 @max-[13rem]:col-span-2 @max-[13rem]:row-start-2">
        <span className="absolute inset-y-[-3px] left-1/2 w-px bg-line" />
        {pct != null && (
          <>
            <span className={`absolute inset-y-0 left-0 rounded-full ${top ? "bg-accent" : "bg-muted/40"}`} style={{ width: `${pct}%` }} />
            <span
              className={`absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface ${top ? "bg-accent" : "bg-muted"}`}
              style={{ left: `${pct}%` }}
            />
          </>
        )}
      </div>
      <span className={`whitespace-nowrap text-right text-label font-extrabold tabular-nums ${top ? "text-accent-ink" : "text-muted"}`}>
        <span className="sr-only">{`MLB ${who} 중 `}</span>
        {verdict}
      </span>
    </li>
  );
}
