import type { PlayerDetail } from "@/lib/api";
import { formatAge, formatBirthDate, formatBody } from "@/lib/format";
import ExternalLinkIcon from "@/components/ExternalLinkIcon";
import PlayerAvatar from "@/components/PlayerAvatar";
import TeamName from "@/components/TeamName";

interface Field {
  label: string;
  value: string;
  /** 값이 길면 두 칸을 쓴다 */
  wide?: boolean;
}

/** 신원 면 항목. 순서는 늘 같고, 값이 없는 항목(매칭 전)만 뺀다. 등번호는 오른쪽 위 '문서 번호' 자리에 따로 둔다. */
function dataFields(player: PlayerDetail): Field[] {
  const age = formatAge(player.age);
  const birth = formatBirthDate(player.birthDate);
  // "1998.08.20 (만 28세)". 하나만 있으면 그것만.
  const birthText = birth && age ? `${birth} (${age})` : (birth ?? age);
  const body = formatBody(player.heightCm, player.weightKg);

  const fields: (Field | null)[] = [
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

/**
 * 선수 신원 면(여권 사진이 있는 면). 바탕에 가는 보안 무늬, 왼쪽 세로 사진, 오른쪽 이름과 고정 순서 항목,
 * 오른쪽 위에 문서 번호처럼 등번호.
 */
export default function PlayerHeader({ player }: { player: PlayerDetail }) {
  const fields = dataFields(player);

  return (
    <div className="guilloche overflow-hidden rounded-[10px] bg-surface p-5">
      {player.jersey && (
        <p className="absolute right-5 top-4 text-right">
          <span className="block text-[0.6875rem] text-muted">등번호</span>
          <span className="block text-xl font-bold leading-tight tracking-tight tabular-nums">
            {`No. ${player.jersey}`}
          </span>
        </p>
      )}

      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5">
        <PlayerAvatar
          size="lg"
          nameKo={player.nameKo}
          photoUrl={player.photoUrl}
          teamAbbr={player.teamAbbr}
        />

        {/* 이름 · 팀 · 링크. 오른쪽 위 등번호와 겹치지 않게 오른쪽 여백을 둔다 */}
        <div className="min-w-0 pr-16 pt-1">
          <h1>
            <span className="block font-display text-[2rem] font-bold leading-tight">{player.nameKo}</span>
            {player.nameEn && (
              <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                {player.nameEn}
              </span>
            )}
          </h1>
          {player.teamKo && (
            <p className="mt-3 flex flex-wrap items-center gap-x-1.5 text-sm font-medium">
              <TeamName teamKo={player.teamKo} teamAbbr={player.teamAbbr} size="md" />
              {player.teamEn && <span className="text-muted">{`(${player.teamEn})`}</span>}
            </p>
          )}
          {player.mlbUrl && (
            <p className="mt-2 text-sm">
              <a
                href={player.mlbUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
              >
                MLB 공식 페이지
                <ExternalLinkIcon />
                <span className="sr-only"> (새 탭에서 열림)</span>
              </a>
            </p>
          )}
          {!player.teamKo && !player.positionKo && (
            <p className="mt-2 text-xs text-muted">아직 선수 정보를 연결하지 못했습니다.</p>
          )}
        </div>

        {/* 항목 칸: 넓은 화면에서는 사진 오른쪽 열(이름 아래)에, 좁은 화면에서는 사진 아래 전체 폭에 */}
        {fields.length > 0 && (
          <dl className="col-span-2 mt-5 grid grid-cols-2 gap-x-6 gap-y-3.5 border-t border-line pt-4 text-sm sm:col-span-1 sm:col-start-2 sm:grid-cols-3">
            {fields.map((field) => (
              <div key={field.label} className={`min-w-0 ${field.wide ? "col-span-2" : ""}`}>
                <dt className="text-xs text-muted">{field.label}</dt>
                <dd className="mt-0.5 break-words font-medium">{field.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
