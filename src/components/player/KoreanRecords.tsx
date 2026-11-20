import Link from "next/link";
import type { RecordNext } from "@/lib/api";
import Chevron from "@/components/Chevron";
import Section from "@/components/Section";
import { count } from "@/components/records/RecordRows";

/** 한국인 메이저리거 역대 기록 화면으로 가는 줄. 칸이 있든 없든 선수 페이지에 늘 하나 남는다 */
function RecordsLink() {
  return (
    <Link
      href="/records"
      className="press-soft flex min-h-11 items-center justify-between gap-2 px-4 py-2.5 text-button text-accent-ink"
    >
      <span>한국인 메이저리거 역대 기록</span>
      <Chevron small />
    </Link>
  );
}

/**
 * 선수 페이지 '한국인 통산 기록'(이슈 #380). 이 선수가 넘기까지 남은 수가 큰 숫자, 아래는 누구를 넘으면 몇 위인지(진행 막대는 없다. 11-17에 기록 화면에서 뺀 것과 같은 이유로 막대가 85~95%에 몰려 차이가 안 보인다).
 * 줄은 lib/koreanRank.ts의 규칙으로 고른다. 줄이 없는 선수(통산 순위 종목이 없는 투수 등)와 기록을 못 받았을 때는
 * 제목 없이 '역대 기록' 줄만 담은 카드 하나를 둔다(빈 칸을 그리지 않는다). '넘으면 한국인 n위'는 기록 화면과 같은 말이다
 */
export default function KoreanRecords({ rows }: { rows: RecordNext[] }) {
  if (rows.length === 0) {
    return (
      <div className="card overflow-hidden">
        <RecordsLink />
      </div>
    );
  }
  return (
    <Section id="korean-records-title" title="한국인 통산 기록" aside="넘기까지 남은 수">
      <div className="card divide-y divide-line overflow-hidden">
        <ul className="divide-y divide-line">
          {rows.map((n) => (
            <li key={n.category} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="min-w-0 flex-1 basis-[8rem]">
                  <span className="text-heading">{n.label}</span>{" "}
                  <span className="whitespace-nowrap text-meta text-muted tabular-nums">
                    통산 {count(n.value)} · 한국인 {n.rank}위
                  </span>
                </p>
                <p className="ml-auto shrink-0 text-stat text-accent-ink tabular-nums">
                  {count(n.toPass)}
                  {n.unit}
                  <span className="sr-only"> 남음</span>
                </p>
              </div>
              <p className="mt-0.5 text-meta text-muted">
                {`${n.targetNameKo} ${count(n.targetValue)}${n.unit} 넘으면 한국인 ${n.rankAfter}위`}
              </p>
            </li>
          ))}
        </ul>
        <RecordsLink />
      </div>
    </Section>
  );
}
