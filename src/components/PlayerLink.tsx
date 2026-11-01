import Link from "next/link";
import PlayerAvatar from "./PlayerAvatar";

interface Props {
  playerId: number;
  nameKo: string;
  photoUrl: string | null;
  teamAbbr: string | null;
  /** 글자 굵기·너비 등. 링크 전체(사진 + 이름)에 붙는다 */
  className?: string;
}

/** 작은 사진 + 선수 이름. 누르면 선수 페이지로 간다. */
export default function PlayerLink({ playerId, nameKo, photoUrl, teamAbbr, className = "" }: Props) {
  return (
    <Link
      href={`/players/${playerId}`}
      className={`group inline-flex min-w-0 items-center gap-2 ${className}`}
    >
      <PlayerAvatar size="sm" nameKo={nameKo} photoUrl={photoUrl} teamAbbr={teamAbbr} />
      <span className="truncate group-hover:text-accent group-hover:underline">{nameKo}</span>
    </Link>
  );
}
