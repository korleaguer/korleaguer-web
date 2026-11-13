import type { PlayerDetail } from "@/lib/api";
import { formatAge, formatBirthDate, formatBody, formatSummary } from "@/lib/format";
import ExternalLinkIcon from "@/components/ExternalLinkIcon";
import Section from "@/components/Section";
import { cacheLife } from "next/cache";

interface Field {
  label: string;
  value: string;
  /** 값이 길면 두 칸을 쓴다 */
  wide?: boolean;
}

/** 선수 정보 항목. 순서는 늘 같고, 값이 없는 항목(매칭 전)만 뺀다. */
function dataFields(player: PlayerDetail): Field[] {
  const age = formatAge(player.age);
  const birth = formatBirthDate(player.birthDate);
  // "1998.08.20 (만 28세)". 하나만 있으면 그것만.
  const birthText = birth && age ? `${birth} (${age})` : (birth ?? age);
  const body = formatBody(player.heightCm, player.weightKg);
  // "샌프란시스코 (San Francisco Giants)". 알약에는 짧은 한글 이름만 있어서 여기서 정식 이름을 보여 준다.
  const team = player.teamKo && player.teamEn ? `${player.teamKo} (${player.teamEn})` : player.teamKo;

  const fields: (Field | null)[] = [
    team ? { label: "소속팀", value: team, wide: true } : null,
    player.positionKo ? { label: "포지션", value: player.positionKo } : null,
    player.batsThrowsKo ? { label: "투타", value: player.batsThrowsKo } : null,
    birthText ? { label: "생년월일", value: birthText } : null,
    body ? { label: "키·몸무게", value: body } : null,
    player.debutYear != null ? { label: "MLB 데뷔", value: `${player.debutYear}년` } : null,
    player.birthPlace ? { label: "출생지", value: player.birthPlace } : null,
    player.careerKo ? { label: "한국 시절", value: player.careerKo, wide: true } : null,
  ];
  return fields.filter((field): field is Field => field !== null);
}

/** 선수 정보 카드: 기본 정보 항목 + MLB 공식 페이지 링크 */
export default async function PlayerInfo({ player }: { player: PlayerDetail }) {
  // 잠깐 재사용: 같은 데이터면 30초 동안 그려 둔 것을 다시 쓴다(쿠키와 상관없는 부품이라 모두에게 같다).
  // 운영 서버(라즈베리파이 4)는 화면 그리기가 느려서 큰 부품을 매번 그리지 않는다.
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  const fields = dataFields(player);

  return (
    <Section id="info-title" title="선수 정보">
      <div className="card p-4">
        {fields.length > 0 ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {fields.map((field) => (
              <div key={field.label} className={`min-w-0 ${field.wide ? "col-span-2" : ""}`}>
                <dt className="text-xs text-muted">{field.label}</dt>
                <dd className="mt-0.5 break-words text-sm font-semibold">{formatSummary(field.value)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted">아직 선수 정보를 연결하지 못했어요.</p>
        )}
        {player.mlbUrl && (
          <a
            href={player.mlbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="press tap-target mt-4 inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-accent-ink hover:underline"
          >
            MLB 공식 페이지
            <ExternalLinkIcon />
            <span className="sr-only"> (새 탭에서 열림)</span>
          </a>
        )}
      </div>
    </Section>
  );
}
