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
 * 알약 색은 옮겨 간 곳: 메이저면 연파랑, 마이너면 회색, 모르면 옅은 회색.
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

function MoveRow({ move }: { move: RosterMove }) {
  const tone =
    move.toLevel === "MLB"
      ? "bg-accent-soft text-accent-ink"
      : move.toLevel === "MINORS"
        ? "bg-neutral-pill text-neutral-pill-fg"
        : "bg-surface-2 text-neutral-pill-fg";
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
