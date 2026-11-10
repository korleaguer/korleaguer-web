import type { RosterMove } from "@/lib/api";
import Section from "@/components/Section";

/** 처음에 보여 줄 줄 수. 나머지는 '더 보기'로 펼친다 */
const VISIBLE = 6;

/** "2026-08-30" → "2026.08.30" */
function dotDate(date: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.replaceAll("-", ".") : date;
}

/**
 * 선수 이동 기록(최신부터): 날짜 · 무엇(알약) · 어디서 어디로.
 * 알약 색: 위기(부상자 명단 등재·이동, DFA, 방출, 출장 정지)는 빨강, 복귀·계약(명단 해제, 정지 해제, 계약)은 초록,
 * 소속이 바뀌는 일(FA 선언, 트레이드, 웨이버 클레임)은 보라.
 * 그 밖에는 옮겨 간 곳: 메이저(콜업 등)면 연파랑, 마이너(강등·이관·재활)면 회색, 모르면 옅은 회색.
 */
export default function RosterMoves({ moves }: { moves: RosterMove[] }) {
  const shown = moves.slice(0, VISIBLE);
  const rest = moves.slice(VISIBLE);

  return (
    <Section id="moves-title" title="이동 기록" aside={moves.length > 0 ? `${moves.length}건` : undefined}>
      {moves.length === 0 ? (
        <p className="card px-4 py-5 text-sm text-muted">최근 두 시즌 동안 이동 기록이 없습니다.</p>
      ) : (
        <div className="card">
          <ol className="divide-y divide-line">
            {shown.map((move, i) => (
              <MoveRow key={`${move.date}-${move.typeCode}-${i}`} move={move} />
            ))}
          </ol>
          {rest.length > 0 && (
            <details className="group border-t border-line">
              <summary className="flex cursor-pointer list-none items-center justify-center gap-1 py-2.5 text-[0.8125rem] font-semibold text-accent-ink [&::-webkit-details-marker]:hidden">
                {`${rest.length}건 더 보기`}
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-3.5 transition-transform duration-200 group-open:rotate-180"
                >
                  <path d="m4 6 4 4 4-4" />
                </svg>
              </summary>
              <ol className="divide-y divide-line border-t border-line">
                {rest.map((move, i) => (
                  <MoveRow key={`${move.date}-${move.typeCode}-r${i}`} move={move} />
                ))}
              </ol>
            </details>
          )}
        </div>
      )}
    </Section>
  );
}

const TONE = {
  danger: "bg-danger-bg text-danger-fg",
  success: "bg-success-bg text-success-fg",
  fa: "bg-fa-bg text-fa-fg",
  majors: "bg-accent-soft text-accent-ink",
  minors: "bg-neutral-pill text-neutral-pill-fg",
  other: "bg-surface-2 text-neutral-pill-fg",
} as const;

/**
 * 이동 종류(MLB 코드)별 색. 이름은 서버(MoveLabels)가 붙인다.
 * DES 지명 할당 · REL 방출 → 위기, SFA·SGN 계약 → 새 출발, DFA(FA 선언) · TR 트레이드 · CLW 웨이버 클레임 → 소속이 바뀜
 */
const TONE_BY_CODE: Record<string, keyof typeof TONE> = {
  DES: "danger",
  REL: "danger",
  SFA: "success",
  SGN: "success",
  DFA: "fa",
  TR: "fa",
  CLW: "fa",
};

/** 부상자 명단(등재·이동·해제)과 출장 정지(·해제)는 코드가 아니라 서버가 붙인 이름으로 가른다 */
const SETBACK_LABELS = ["부상자 명단", "출장 정지"];

function moveTone(move: RosterMove): string {
  const label = move.labelKo ?? "";
  if (SETBACK_LABELS.some((head) => label.startsWith(head))) {
    return TONE[label.endsWith("해제") ? "success" : "danger"];
  }
  if (label === "계약") return TONE.success;
  const byCode = TONE_BY_CODE[move.typeCode?.toUpperCase() ?? ""];
  if (byCode) return TONE[byCode];
  if (move.toLevel === "MLB") return TONE.majors;
  if (move.toLevel === "MINORS") return TONE.minors;
  return TONE.other;
}

function MoveRow({ move }: { move: RosterMove }) {
  const tone = moveTone(move);
  const route = [move.fromTeam, move.toTeam].filter(Boolean).join(" → ");

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <time dateTime={move.date} className="w-[5.25rem] shrink-0 pt-0.5 text-[0.8125rem] tabular-nums text-muted">
        {dotDate(move.date)}
      </time>
      <div className="min-w-0 flex-1">
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold leading-[1.125rem] ${tone}`}>
          {move.labelKo}
        </span>
        {route && <p className="mt-1 text-[0.8125rem] leading-snug text-pretty">{route}</p>}
      </div>
    </li>
  );
}
