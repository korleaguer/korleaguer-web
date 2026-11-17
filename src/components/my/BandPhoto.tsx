"use client"; // 사진이 안 뜰 때(onError) 이니셜 원으로 바꿔야 해서 클라이언트 컴포넌트다.

import PlayerAvatar from "@/components/PlayerAvatar";
import { useImageFailed } from "@/lib/useImageFailed";

interface Props {
  nameKo: string;
  photoUrl: string | null;
  teamAbbr: string | null;
  /**
   * 첫 화면에 보이는 카드(내 선수 첫 줄)면 true: 사진을 바로 받는다. 아니면 화면에 다가올 때 받는다(loading="lazy").
   * 예전에는 화면 밖 카드 사진까지 처음에 모두 받았다(11-17 점검). 첫 화면 사진을 늦추면 늦게 떠서 첫 줄만 바로 받는다
   */
  eager?: boolean;
}

/**
 * 내 선수 카드의 팀 색 무대(.player-stage) 오른쪽에 서는 배경 없는 선수 사진.
 * 띠보다 크게 두고 아래를 띠 밖으로 내려, 어깨의 잘린 선이 보이지 않고 띠 아래 끝에서 잘린 것처럼 보이게 한다.
 * 그림자를 둘러 팀 색 배경과 떨어져 보이게 한다.
 * 사진이 없거나 안 뜨면 흰 테두리 이니셜 원으로 대신한다. 이름이 바로 아래 있어 사진은 읽지 않는다.
 */
export default function BandPhoto({ nameKo, photoUrl, teamAbbr, eager = false }: Props) {
  const { failed, ref, onError } = useImageFailed(photoUrl);

  if (!photoUrl || failed) {
    return (
      <span className="absolute bottom-[12px] right-[16px]">
        <PlayerAvatar size={56} ring nameKo={nameKo} photoUrl={null} teamAbbr={teamAbbr} />
      </span>
    );
  }

  return (
    // 우리가 호스팅하는 사진(/photos/…)이다(PlayerAvatar와 같은 이유로 next/image를 쓰지 않는다).
    // eslint-disable-next-line @next/next/no-img-element -- 우리 서버를 거치지 않고 브라우저가 직접 받는다
    <img
      ref={ref}
      src={photoUrl}
      alt=""
      width={112}
      height={112}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={onError}
      // 띠(92px)보다 크게 두고 아래 16px을 띠 밖으로 내린다. 모자 위로는 여백이 조금 남는다.
      // 사진·띠는 px로 둔다: 큰 글씨(앱 2배)에서 rem이면 사진이 224px로 커져 띠를 덮고 상태 배지 자리를 빼앗았다(이슈 #264)
      className="absolute -bottom-[16px] right-[8px] size-[112px] object-contain object-bottom drop-shadow-[0_3px_6px_rgb(0_0_0/0.28)]"
    />
  );
}
