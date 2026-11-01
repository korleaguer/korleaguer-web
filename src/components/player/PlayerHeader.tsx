import type { ReactNode } from "react";
import type { PlayerDetail } from "@/lib/api";
import { formatAge, formatBirthDate, formatBody } from "@/lib/format";
import PlayerAvatar from "@/components/PlayerAvatar";
import TeamName from "@/components/TeamName";

interface Info {
  label: string;
  value: string;
  /** 값이 길면 두 칸을 쓴다 */
  wide?: boolean;
}

/** 정보 칸. 값이 없는 항목은 만들지 않는다. */
function infoItems(player: PlayerDetail): Info[] {
  const age = formatAge(player.age);
  const birth = formatBirthDate(player.birthDate);
  // "만 28세 (1998.08.20)". 하나만 있으면 그것만.
  const ageText = age && birth ? `${age} (${birth})` : (age ?? birth);
  const body = formatBody(player.heightCm, player.weightKg);

  const items: (Info | null)[] = [
    player.positionKo ? { label: "포지션", value: player.positionKo } : null,
    player.jersey ? { label: "등번호", value: `#${player.jersey}` } : null,
    ageText ? { label: "나이", value: ageText } : null,
    body ? { label: "키·몸무게", value: body } : null,
    player.batsThrowsKo ? { label: "투타", value: player.batsThrowsKo } : null,
    player.debutYear != null ? { label: "MLB 데뷔", value: `${player.debutYear}년` } : null,
    player.birthPlace ? { label: "출생지", value: player.birthPlace, wide: true } : null,
    player.careerKo ? { label: "한국 시절", value: player.careerKo, wide: true } : null,
  ];
  return items.filter((item): item is Info => item !== null);
}

/** 선수 사진·이름·팀과 정보 칸. 매칭 전이라 비어 있는 항목은 숨긴다. */
export default function PlayerHeader({ player }: { player: PlayerDetail }) {
  const items = infoItems(player);

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center gap-4">
        <PlayerAvatar
          size="lg"
          nameKo={player.nameKo}
          photoUrl={player.photoUrl}
          teamAbbr={player.teamAbbr}
        />
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-2xl font-extrabold tracking-tight">{player.nameKo}</span>
            {player.nameEn && <span className="text-sm text-muted">{player.nameEn}</span>}
          </h1>
          {player.teamKo && (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-sm font-medium">
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
                className="font-semibold text-accent hover:underline"
              >
                MLB 공식 페이지 ↗<span className="sr-only"> (새 탭에서 열림)</span>
              </a>
            </p>
          )}
          {!player.teamKo && !player.positionKo && (
            <p className="mt-1 text-xs text-muted">아직 선수 정보를 연결하지 못했습니다.</p>
          )}
        </div>
      </div>
      {items.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <Meta key={item.label} label={item.label} wide={item.wide}>
              {item.value}
            </Meta>
          ))}
        </dl>
      )}
    </div>
  );
}

function Meta({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={`min-w-0 ${wide ? "col-span-2" : ""}`}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 break-words font-medium">{children}</dd>
    </div>
  );
}
