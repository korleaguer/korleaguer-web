"use client"; // 무대 사진(BandPhoto, 클라이언트)이 읽는 맥락(context)을 건네는 곳이라 클라이언트 컴포넌트다.

import { createContext, useContext, type ReactNode } from "react";

const EagerPhoto = createContext(false);

/**
 * 안에 든 카드의 무대 사진을 바로 받을지(첫 화면 줄이면 true). 내 선수 목록이 카드 밖에서 감싸 건넨다.
 * 카드(FormCard)는 "use cache"라 props가 캐시 열쇠다. 예전처럼 카드 props(eagerPhoto)로 넘기면 같은 선수·같은 기록 카드도
 * 3번째·4번째 자리를 오갈 때마다(순서 바꾸기·넣기·빼기) 캐시를 못 쓰고 다시 그렸다(11-18 리뷰). 감싸서 건네면 캐시와 상관없다
 */
export function PhotoPriority({ eager, children }: { eager: boolean; children: ReactNode }) {
  return <EagerPhoto value={eager}>{children}</EagerPhoto>;
}

/** 무대 사진을 바로 받을지. 감싼 것이 없으면(비시즌 홈 옛 카드) 화면에 다가올 때 받는다 */
export function useEagerPhoto(): boolean {
  return useContext(EagerPhoto);
}
