import Celebrate from "@/components/Celebrate";

/**
 * 경기 카드 안 화제 문구 한 줄(11-21 사용자 결정): 주황 점(6px) + 글자. 알약도 상자도 아니다.
 * 카드에 한 줄 기록(숫자)이 이미 있어서, 문구는 맥락(처음·넘음·연속)만 말하고 같은 숫자를 되풀이하지 않는다(서버가 만든다).
 * celebrate가 있으면 이 줄이 카드의 가장 큰 표시라서 처음 보일 때 한 번 작게 커졌다 돌아온다.
 */
export default function BuzzLine({
  text,
  className = "",
  celebrate,
}: {
  text: string;
  className?: string;
  celebrate?: { id: string; order: number };
}) {
  const line = (
    <span className="flex items-start gap-1.5 text-summary text-hot-ink">
      {/* 줄이 바뀌어도 점은 첫 줄 가운데에 머문다 */}
      <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-hot" />
      <span className="min-w-0 text-pretty">{text}</span>
    </span>
  );
  return (
    <p className={className}>
      {celebrate ? (
        <Celebrate id={celebrate.id} order={celebrate.order} scale={1.05} origin="left center" className="block">
          {line}
        </Celebrate>
      ) : (
        line
      )}
    </p>
  );
}
