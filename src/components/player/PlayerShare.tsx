"use client"; // 공유 창을 열고 닫고, 카드 그림을 받아 기기 공유로 보내야 해서 클라이언트 컴포넌트다.

import { useEffect, useRef, useState } from "react";
import BottomSheet from "@/components/BottomSheet";
import { appHas, isInApp, postToApp } from "@/lib/app";
import { toast } from "@/lib/toast";
import { useHistorySheet } from "@/lib/useHistorySheet";

/** 창을 열며 쌓은 주소 기록 표시(history.state의 키). 다른 창들의 표시와 다르다 */
const SHARE_STATE = "korleaguerPlayerShare";

/** 앱 머리글의 공유 단추(ShareButton)가 선수 페이지에서 이 창을 열라고 보내는 신호 */
export const OPEN_PLAYER_SHARE = "korleaguer:open-player-share";

/**
 * 선수 페이지 공유 단추와 창(이슈 #381). 단추는 머리 카드 오른쪽에 하나뿐이다. 앱(웹뷰)에서는 앱 머리글의 공유 단추가 이 창을
 * 열고(ShareButton), 이 단추는 숨겨서 한 화면에 공유 단추가 둘이 되지 않는다.
 * 창에는 한국인 순위 카드 미리보기와 '그림 보내기'·'링크 복사'. 카드는 서버가 그리는 그림(players/[id]/og/card)을 그대로 보이고 그 그림 파일을 보낸다.
 * 휴대폰은 아래 창, PC는 가운데 창(BottomSheet).
 */
export default function PlayerShare({ playerId, nameKo, version }: { playerId: number; nameKo: string; version: string }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { open, openSheet, close } = useHistorySheet(SHARE_STATE, buttonRef);
  const openRef = useRef(openSheet);
  useEffect(() => {
    openRef.current = openSheet;
  });

  useEffect(() => {
    const onSignal = (event: Event) => {
      // 신호를 받았다고 알린다(ShareButton이 받는 곳이 없으면 링크 공유로 물러난다)
      event.preventDefault();
      openRef.current();
    };
    window.addEventListener(OPEN_PLAYER_SHARE, onSignal);
    return () => window.removeEventListener(OPEN_PLAYER_SHARE, onSignal);
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${nameKo} 공유하기`}
        aria-haspopup="dialog"
        onClick={openSheet}
        // 누르는 자리 44px. 앱에서는 머리글 단추가 같은 일을 하므로 숨긴다
        className="press grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-foreground in-app:hidden"
      >
        <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 14V3.5" />
          <path d="m7.5 7.5 4.5-4.5 4.5 4.5" />
          <path d="M8.5 10H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1.5" />
        </svg>
      </button>
      {open && <ShareSheet playerId={playerId} nameKo={nameKo} version={version} onClose={close} />}
    </>
  );
}

type Card = { state: "loading" } | { state: "none" } | { state: "ready"; blob: Blob; src: string; alt: string };

function ShareSheet({ playerId, nameKo, version, onClose }: { playerId: number; nameKo: string; version: string; onClose: () => void }) {
  const [card, setCard] = useState<Card>({ state: "loading" });
  const [canSendFile, setCanSendFile] = useState(false);
  const fileName = `${nameKo}-한국인-순위.png`;
  const cardPath = `/players/${playerId}/og/card/${version}`;
  // 이 값으로 바뀌는 '그림 보내기'는 그림을 받은 뒤(브라우저에서만)에 그려지므로 렌더 중에 앱 정보를 읽어도 서버 HTML과 어긋나지 않는다
  const appImageShare = appHas("share-image");
  /** 보내는 선수 페이지 주소(링크 복사와 그림 보내기가 같은 주소를 쓴다) */
  const pageUrl = () => `${window.location.origin}/players/${playerId}`;

  // 창을 열 때 그림을 한 번 받아 미리보기와 보내기에 같이 쓴다(보내는 순간 기다리면 사용자 동작 시간이 지나 공유 창이 막힌다)
  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    fetch(cardPath)
      .then(async (res) => {
        if (!res.ok) throw new Error("no card");
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        let alt = "";
        try {
          alt = decodeURIComponent(res.headers.get("x-card-alt") ?? "");
        } catch {
          // 대체 글을 못 읽어도 그림은 보인다
        }
        const file = new File([blob], fileName, { type: "image/png" });
        setCanSendFile(typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }));
        setCard({ state: "ready", blob, src: objectUrl, alt });
      })
      .catch(() => {
        if (!cancelled) setCard({ state: "none" });
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [cardPath, fileName]);

  async function sendImage() {
    if (card.state !== "ready") return;
    // 그림 공유를 아는 앱(아이폰 앱): 웹뷰는 파일 공유가 안 되므로 앱이 같은 그림을 받아 기기 공유 창에 링크와 함께 붙인다
    if (appImageShare) {
      postToApp({ type: "share-image", imageUrl: `${window.location.origin}${cardPath}`, url: pageUrl(), title: `${nameKo} 한국인 순위` });
      return;
    }
    const file = new File([card.blob], fileName, { type: "image/png" });
    if (canSendFile) {
      try {
        await navigator.share({ files: [file], title: `${nameKo} 한국인 순위` });
        return;
      } catch (error) {
        // 공유 창을 닫은 것(AbortError)은 할 일이 없다. 그 밖의 실패(누른 뒤 시간이 지남 등)는 파일 저장으로 물러난다
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    // 파일 공유가 없는 브라우저(PC 등): 그림 파일을 저장한다
    const link = document.createElement("a");
    link.href = card.src;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast("그림을 저장했어요", { tone: "success" });
  }

  async function copyLink() {
    const url = pageUrl();
    try {
      await navigator.clipboard.writeText(url);
      toast("링크를 복사했어요", { tone: "success" });
    } catch {
      // 앱 웹뷰는 복사가 막힐 수 있다: 앱이 기기 공유 창으로 링크를 보낸다
      if (isInApp()) {
        postToApp({ type: "share", url, title: `${nameKo} 한국인 순위` });
        return;
      }
      toast("링크를 복사하지 못했어요", { tone: "error" });
    }
  }

  // 앱 웹뷰에서 파일 공유가 안 되면 저장도 못 하므로, 그림 공유를 모르는 앱(옛 앱·안드로이드 앱)에서는 그림 보내기를 숨긴다(링크 복사만)
  const showImageButton = card.state === "ready" && (canSendFile || appImageShare || !isInApp());

  return (
    <BottomSheet title="공유하기" onClose={onClose} widthClassName="sm:max-w-xl">
      <div className="pt-2">
        {card.state === "ready" ? (
          // eslint-disable-next-line @next/next/no-img-element -- 서버가 그린 카드 그림(받아 둔 파일)
          <img src={card.src} alt={card.alt} width={1080} height={1350} className="mx-auto h-auto max-h-[52dvh] w-auto max-w-full rounded-lg border border-line sm:max-h-[58dvh]" />
        ) : card.state === "loading" ? (
          <div aria-hidden className="mx-auto aspect-[4/5] max-h-[52dvh] animate-pulse rounded-lg bg-surface-2 sm:max-h-[58dvh]" />
        ) : (
          <p className="py-6 text-center text-meta text-muted">{nameKo} 선수는 보낼 카드가 아직 없어요</p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {showImageButton && (
            <button type="button" onClick={sendImage} className="press min-h-12 rounded-xl bg-accent text-button font-semibold text-accent-fg">
              그림 보내기
            </button>
          )}
          <button
            type="button"
            onClick={copyLink}
            className={`press min-h-12 rounded-xl bg-surface-2 text-button font-semibold text-foreground ${showImageButton ? "" : "col-span-2"}`}
          >
            링크 복사
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
