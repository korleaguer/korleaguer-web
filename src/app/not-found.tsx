import type { Metadata } from "next";
import NotFoundNotice from "@/components/NotFoundNotice";

// 탭 제목: "페이지를 찾을 수 없어요 · KOR Leaguer"(뒷부분은 layout의 template이 붙인다). 없으면 홈과 같은 'KOR Leaguer'라
// 탭·방문 기록에서 없는 주소인지 알 수 없었다(WCAG 2.4.2, 전수조사). 없는 선수·기사 제목과 같은 말투
export const metadata: Metadata = {
  title: "페이지를 찾을 수 없어요",
};

// 어느 화면에도 맞지 않는 주소일 때 (HTTP 404)
export default function NotFound() {
  return <NotFoundNotice />;
}
