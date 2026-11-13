"use client";

// 숫자가 굴러가며 바뀐다(토스 금액처럼). ".276", "3.91", "1,480", "10"처럼 숫자 하나가 든 글을 받아,
// 숫자 부분만 짧게(0.6초) 세고 앞뒤 글과 쓰는 꼴(소수 자리, 앞 0 생략, 쉼표)은 그대로 둔다.
// 굴리는 때는 하나뿐이다: 이미 보이던 값이 바뀔 때(예: 내 선수 기간 7·14·30일 바꾸기). 앞 값에서 새 값으로 센다.
// 처음 그려질 때·화면에 들어올 때는 굴리지 않고 최종 값으로 서 있다(DESIGN.md Still Numbers Rule, 이슈 #188).
// 기록은 계좌 잔액처럼 수시로 바뀌는 값이 아니라서 볼 때마다 0부터 세면 어지럽고, 찍으면 중간 값이 찍혔다.
// '동작 줄이기'가 켜져 있거나 숫자가 없거나 둘 이상이면("7-2") 굴리지 않는다. 화면 낭독기는 늘 최종 값을 읽는다.
import { useEffect, useRef, useState } from "react";

const DURATION_MS = 600;

interface Parsed {
  prefix: string;
  suffix: string;
  value: number;
  decimals: number;
  /** ".276"처럼 0을 떼고 쓰는가 */
  leadingDot: boolean;
  /** "1,480"처럼 쉼표를 쓰는가 */
  comma: boolean;
}

function parse(text: string): Parsed | null {
  if ((text.match(/\d+(?:[.,]\d+)*/g) ?? []).length !== 1) return null;
  const m = /^(.*?)(-?(?:\d[\d,]*(?:\.\d+)?|\.\d+))(.*)$/.exec(text);
  if (!m) return null;
  let [, prefix, num] = m;
  const suffix = m[3];
  // "D-3"의 '-'는 부호가 아니라 글이다(맨 앞이나 띄어쓰기 뒤의 '-'만 부호)
  if (num.startsWith("-") && prefix && !/\s$/.test(prefix)) {
    prefix += "-";
    num = num.slice(1);
  }
  const value = Number(num.replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;
  return {
    prefix,
    suffix,
    value,
    decimals: num.includes(".") ? num.split(".")[1].length : 0,
    leadingDot: /^-?\./.test(num),
    comma: num.includes(","),
  };
}

function format(p: Parsed, v: number): string {
  let s = p.comma
    ? v.toLocaleString("en-US", { minimumFractionDigits: p.decimals, maximumFractionDigits: p.decimals })
    : v.toFixed(p.decimals);
  if (p.leadingDot) s = s.replace(/^(-?)0\./, "$1.");
  return `${p.prefix}${s}${p.suffix}`;
}

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function RollingNumber({ value }: { value: string }) {
  // 굴리는 중에 보일 글. null이면 value(최종 값)를 그대로 보인다. 처음에는 null이라 서버가 그린 값 그대로다
  const [rolling, setRolling] = useState<string | null>(null);
  // 값이 바뀐 것을 렌더 중에 알아챈다(React 권장 방식). 바뀌면 굴리기 전 첫 프레임에 새 값이 한 번 비치지 않게 앞 글을 잡아 둔다
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    const next = parse(value);
    const before = parse(prev);
    // 숫자가 실제로 달라질 때만 굴린다(같은 숫자를 다르게 쓴 글이면 그냥 바꾼다)
    if (next && before && next.value !== before.value && !reducedMotion()) setRolling(rolling ?? prev);
  }
  // 지금 화면에 보이는 숫자. 처음에는 최종 값이다. 숫자가 아닌 글("-")이 오면 앞 숫자를 기억해 두었다가 거기서부터 센다
  const current = useRef<number | null>(parse(value)?.value ?? null);

  useEffect(() => {
    const p = parse(value);
    if (!p) return;
    const from = current.current;
    if (from == null || from === p.value || reducedMotion()) {
      current.current = p.value;
      return;
    }
    let frame = 0;
    const begin = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - begin) / DURATION_MS);
      const eased = 1 - (1 - t) ** 3;
      const v = from + (p.value - from) * eased;
      current.current = t < 1 ? v : p.value;
      setRolling(t < 1 ? format(p, v) : null);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    // 굴리는 도중에 값이 또 바뀌면 지금 보이는 값(current)에서 새 값으로 이어 센다
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="select-none">
        {rolling ?? value}
      </span>
    </>
  );
}
