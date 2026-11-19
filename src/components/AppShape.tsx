"use client";

// 이 화면이 그린 모양을 앱에 알린다(앱 웹뷰 안에서만). 앱은 받은 값을 기기에 저장해 두었다가 다음 실행 때 로딩 뼈대를
// 그 모양으로 그린다(korleaguer-app#54). 앱 밖(브라우저)에서는 postToApp이 아무 일도 하지 않고, 이 메시지를 모르는 옛 앱은 버린다.
// 메시지 이름과 모양은 앱 저장소 src/lib/shape.ts(ShapeMessage)와 같아야 한다.
import { useEffect } from "react";
import { postToApp } from "@/lib/app";

/** 홈 맨 위 묶음: "posting" = MLB 도전 카드, "report" = 비시즌 성적표(포스팅 선수 없음), "season" = 시즌 중 층 */
export type HomeTop = "posting" | "report" | "season";
/** 기록 탭 맨 위 묶음 순서: "passed" = 올해 넘은 기록, "next" = 다음에 넘을 기록. 그려지지 않은 묶음은 뺀다 */
export type RecordsOrder = ("passed" | "next")[];

type Props = {
  home?: HomeTop;
  records?: RecordsOrder;
  /** 내 선수 수. 0이면 /my가 선수 고르기 목록으로 열린다 */
  my?: number;
};

/** 보이는 화면 하나가 자기 몫의 모양만 알린다(앱이 화면별로 합쳐 저장한다). 화면에 아무것도 그리지 않는다 */
export default function AppShape({ home, records, my }: Props) {
  // 배열은 글자로 바꿔 의존 값에 둔다(다시 그릴 때마다 새 배열이라 매번 보내지 않게)
  const order = records?.join(",");
  useEffect(() => {
    postToApp({
      type: "shape",
      ...(home !== undefined && { home }),
      ...(order !== undefined && { records: order === "" ? [] : order.split(",") }),
      ...(my !== undefined && { my }),
    });
  }, [home, order, my]);
  return null;
}
