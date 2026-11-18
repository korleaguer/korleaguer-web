import { Fragment } from "react";

/**
 * 띄어쓰기 자리에서만 줄을 바꾼다(낱말마다 줄바꿈을 막는다).
 * 아이폰(WebKit)은 낱말 줄바꿈(keep-all)에서도 숫자 쉼표 뒤('1,' / '300만'), 여는 괄호 뒤('2안타(' / '2루타 1)'),
 * 가운뎃점과 줄바꿈 없는 공백 사이('·' / '11월')를 줄바꿈 자리로 봐서 큰 글씨에서 금액·기록·날짜가 갈렸다
 * (단어 잇기 문자 U+2060도 듣지 않았다, 이슈 #264). 11-17 시뮬레이터 사파리에서 폭 220~420px로 재 보니 그냥 글자는
 * 404번 중 56번 갈렸고 이 묶음은 0번이었다. 글자만으로는 막을 수 없어 요소로 감싼다.
 * 한 덩어리로 둘 낱말은 U+00A0으로 이어서 넘긴다(예: formatSummary의 '2루타 1', 기사 출처 줄의 '· 11월').
 * 낱말 하나가 줄보다 길면 넘치므로 짧은 낱말 묶음에만 쓴다.
 */
export default function Words({ text }: { text: string }) {
  return text.split(" ").map((word, i) => (
    <Fragment key={i}>
      {i > 0 && " "}
      <span className="whitespace-nowrap">{word}</span>
    </Fragment>
  ));
}

/**
 * 짧은 낱말 묶음을 한 덩어리로(데이터 기준 시각 '· 기준 11월 17일(화) 09:00'). 줄에 남은 자리가 모자라면 통째로 다음 줄로
 * 넘기고, 그 줄보다도 길 때만(큰 글씨) 띄어쓰기에서 나눈다(inline-block 안의 Words). Words만 쓰면 남은 자리만큼 채우고
 * 넘겨서, 보통 크기 375px '내 선수' 머리말에서도 '… · 기준 11월' / '17일(화) 09:00'처럼 날짜가 갈렸다(이슈 #277)
 */
export function WordGroup({ text }: { text: string }) {
  return (
    <span className="inline-block">
      <Words text={text} />
    </span>
  );
}
