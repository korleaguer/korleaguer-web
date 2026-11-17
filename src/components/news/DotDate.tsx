/**
 * 기사 출처 줄 끝의 '· 11월 17일(화)'(또는 '· 17:05'). '·'와 첫 낱말은 한 덩어리(줄바꿈 막음)로, 그 뒤 띄어쓰기에서만 줄이 바뀐다.
 * 줄바꿈 없는 공백(U+00A0)만으로는 아이폰(WebKit)이 낱말 줄바꿈(keep-all)에서 그 자리를 줄바꿈 자리로 봐서
 * 큰 글씨에서 '·'만 윗줄에 남았다(이슈 #264)
 */
export default function DotDate({ text }: { text: string }) {
  const [first, ...rest] = text.split(" ");
  return (
    <>
      <span className="whitespace-nowrap">{`·\u00a0${first}`}</span>
      {rest.length > 0 && ` ${rest.join(" ")}`}
    </>
  );
}
