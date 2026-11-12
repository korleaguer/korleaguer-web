"use client";

// 숫자가 굴러가며 바뀐다(토스 금액처럼). ".276", "3.91", "1,480", "10"처럼 숫자 하나가 든 글을 받아,
// 숫자 부분만 짧게(0.6초) 세어 올리고 앞뒤 글과 쓰는 꼴(소수 자리, 앞 0 생략, 쉼표)은 그대로 둔다.
// 굴리는 때는 둘뿐이다. 이미 보이던 숫자를 0으로 깜빡이지 않게, 처음 그려질 때 보이던 숫자는 그대로 둔다.
// - 처음에 화면 밖에 있다가 화면 안으로 들어올 때(0에서부터)
// - 값이 바뀔 때(앞 값에서 새 값으로)
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

function inView(el: Element): boolean {
  const { top, bottom } = el.getBoundingClientRect();
  return bottom > 0 && top < window.innerHeight;
}

export default function RollingNumber({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  // 한 번이라도 화면에 보였는가(보이기 전에는 0으로 두고 기다린다)
  const seen = useRef(false);
  // 지금 화면에 보이는 숫자
  const current = useRef(0);

  useEffect(() => {
    const el = ref.current;
    const p = parse(value);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let observer: IntersectionObserver | null = null;

    const run = (from: number, to: Parsed) => {
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION_MS);
        const eased = 1 - (1 - t) ** 3;
        const v = from + (to.value - from) * eased;
        current.current = v;
        setShown(t < 1 ? format(to, v) : value);
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };

    if (!el || !p || reduce) {
      seen.current = true;
      // 숫자가 아닌 글("-")이면 앞 숫자를 기억해 두었다가, 다시 숫자가 오면 거기서부터 센다
      if (p) current.current = p.value;
      setShown(value);
    } else if (!seen.current) {
      // 처음: 이미 보이면 그대로, 화면 밖이면 0으로 두었다가 보일 때 센다(화면 밖이라 0은 보이지 않는다)
      if (inView(el)) {
        seen.current = true;
        current.current = p.value;
        setShown(value);
      } else {
        setShown(format(p, 0));
        observer = new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting) return;
            observer?.disconnect();
            seen.current = true;
            run(0, p);
          },
          { rootMargin: "0px 0px -10% 0px" },
        );
        observer.observe(el);
      }
    } else if (current.current !== p.value) {
      run(current.current, p);
    } else {
      setShown(value);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [value]);

  return (
    <>
      <span className="sr-only">{value}</span>
      <span ref={ref} aria-hidden className="select-none">
        {shown}
      </span>
    </>
  );
}
