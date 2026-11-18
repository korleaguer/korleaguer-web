import type { ReactNode } from "react";

/*
 * 화면별 로딩 뼈대(데이터를 받는 동안 보이는 회색 자리). 예전에는 모든 화면이 회색 줄 카드 하나(LoadingBlock)라 실제 화면보다
 * 짧고 모양도 달라서, 첫 화면에 바닥글이 먼저 보였다가 내용이 오면 밀려 내려갔다(NN/g Skeleton Screens, web.dev CLS, 전수조사).
 * 이제 화면마다 실제 배치(375px에서 잰 카드·줄 높이)를 닮은 뼈대를 두고, 뼈대 틀은 화면 높이(100dvh) 이상이라 바닥글이
 * 첫 화면에 나오지 않는다. 페이지 제목(h1)이 정해진 화면(선수·뉴스·기록)은 제목을 뼈대 밖에 그대로 두고, 제목이 데이터
 * 머리 줄 안에 있는 내 선수 화면은 뼈대가 같은 자리에 진짜 제목을 그린다. 홈은 지금 운영 모양인 비시즌(MLB 도전 큰 카드 +
 * 성적표 줄 목록)을 닮게 그린다(HomeSkeleton). 앱 뼈대(korleaguer-app LoadingSkeleton)와 같은 회색 상자 방식이다.
 */

/**
 * 회색 막대 하나(글 한 줄·숫자·칩 자리). 색은 놓이는 곳에 따라: 카드 위는 카드 안 회색(surface-2),
 * 페이지 바탕 위(onPage)는 바탕보다 한 단계 진한 회색, 바탕 위 흰 알약 자리(white)는 카드 색
 */
function Bone({ className = "", onPage = false, white = false }: { className?: string; onPage?: boolean; white?: boolean }) {
  const tone = white ? "bg-surface" : onPage ? "bg-neutral-pill" : "bg-surface-2";
  // 모서리는 기본 알약(완전히 둥글게). 큰 숫자 자리처럼 모서리를 따로 주면(rounded-lg) 그것만 쓴다(같은 속성 클래스를 겹치지 않게)
  const shape = /(^|\s)rounded-/.test(className) ? "" : "rounded-full";
  return <div className={`${shape} ${tone} ${className}`} />;
}

/** 원(사진 자리) */
function Circle({ className = "" }: { className?: string }) {
  return <div className={`shrink-0 rounded-full bg-surface-2 ${className}`} />;
}

/**
 * 뼈대 틀: 화면 낭독기에는 '불러오는 중' 한 번만 읽히고, 눈에는 은은하게 깜빡이는 회색 자리가 보인다(동작 줄이기면 멈춤).
 * 화면 높이 이상으로 잡아 바닥글이 첫 화면에 먼저 보이지 않게 한다. className은 뼈대 배치(간격·격자)
 */
function Frame({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div role="status" className="min-h-[100dvh]">
      <span className="sr-only">불러오는 중</span>
      <div aria-hidden className={`animate-pulse motion-reduce:animate-none ${className}`}>
        {children}
      </div>
    </div>
  );
}

/** 카드 밖 섹션 제목 자리(text-title 26px + 아래 10px) */
function SectionTitle({ className = "w-36" }: { className?: string }) {
  return <Bone onPage className={`mb-2.5 h-[1.625rem] ${className}`} />;
}

/** '내 선수'·성적표 카드: 위 92px 팀 색 무대 + 이름 줄 + 알약 + 숫자 칸 + 한 줄 */
function StageCard() {
  return (
    <div className="card overflow-hidden">
      <div className="h-[92px] bg-surface-2" />
      <div className="px-4 pb-4 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2">
            <Bone className="h-6 w-20" />
            <Bone className="h-3.5 w-28" />
          </div>
          <Circle className="size-9" />
        </div>
        <Bone className="mt-3 h-[1.375rem] w-36" />
        <div className="mt-3.5 flex items-end justify-between gap-3">
          <div className="space-y-2">
            <Bone className="h-3 w-20" />
            <Bone className="h-10 w-24 rounded-lg" />
          </div>
          <div className="grid w-1/2 grid-cols-3 gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-surface-2" />
            ))}
          </div>
        </div>
        <Bone className="mt-3 h-3.5 w-48" />
      </div>
    </div>
  );
}

/** 글 한 줄 자리: 줄 높이(h)만큼 칸을 잡고 그 가운데 회색 막대(bone 클래스)를 둔다. 실제 글줄과 높이를 맞추려고 쓴다 */
function Line({ h, bone }: { h: string; bone: string }) {
  return (
    <div className={`flex items-center ${h}`}>
      <Bone className={bone} />
    </div>
  );
}

/**
 * 성적표 목록 한 줄(SeasonReportList): 사진 44px | 이름·판정·상태·숫자 줄(lines: 둘째 줄부터 막대 폭) | 작은 달별 막대 84×30.
 * second가 있으면 사진만큼 들인 둘째 줄(거론 구단·이번 겨울 기사), open이면 막대 자리에 '접기'와 아래 펼친 곳
 */
function ReportRowSkeleton({ lines, second = false, open = false }: { lines: string[]; second?: boolean; open?: boolean }) {
  return (
    <div>
      <div className={`grid grid-cols-[44px_minmax(0,1fr)_84px] items-center gap-x-3 pt-3 ${second ? "pb-1" : "pb-3"}`}>
        <Circle className="size-11" />
        <div>
          <Line h="h-[1.375rem]" bone="h-4 w-[4.5rem]" />
          {lines.map((w, i) => (
            <Line key={i} h="h-5" bone={`h-3 ${w}`} />
          ))}
        </div>
        {open ? (
          <Bone className="h-4 w-10 self-start justify-self-end" />
        ) : (
          // 작은 달별 막대: 칸 가운데(평균) 위아래로 높이가 다른 여섯 막대
          <div className="flex h-[30px] w-[84px] items-end gap-1 px-0.5">
            {["h-[18px]", "h-[13px]", "h-[22px]", "h-[11px]", "h-[16px]", "h-[8px]"].map((h, i) => (
              <div key={i} className={`flex-1 rounded-t-[3px] bg-surface-2 ${h}`} />
            ))}
          </div>
        )}
      </div>
      {second && (
        <div className="pb-2 pl-14">
          <Line h="h-6" bone="h-3 w-[85%]" />
        </div>
      )}
      {open && <ReportPanelSkeleton />}
    </div>
  );
}

/** 펼친 곳(375px에서 잰 359px): 한 줄 흐름 → 달별 막대(범례·여섯 칸·안내) → MLB 안 위치 세 줄 → 선 아래 별·링크 */
function ReportPanelSkeleton() {
  return (
    <div className="pb-4">
      <Line h="h-[1.375rem]" bone="h-4 w-60" />
      <div className="mt-3 flex h-4 items-center justify-between">
        <Bone className="h-3 w-16" />
        <Bone className="h-3 w-24" />
      </div>
      <div className="mt-1.5 grid h-[5.375rem] grid-cols-6 items-end">
        {["h-6", "h-[1.375rem]", "h-7", "h-4", "h-5", "h-2.5"].map((h, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 px-[9px]">
            <Bone className="h-3 w-6" />
            <div className={`w-full rounded-t-[5px] rounded-b-[2px] bg-surface-2 ${h}`} />
            <Bone className="mb-0.5 h-2.5 w-5" />
          </div>
        ))}
      </div>
      <Line h="mt-1 h-4" bone="h-3 w-48" />
      <div className="mt-4 space-y-2">
        <Line h="h-5" bone="h-3 w-28" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex h-7 items-center gap-3">
            <Bone className="h-3 w-8" />
            <Bone className="h-2 flex-1" />
            <Bone className="h-3 w-12" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex h-[3.0625rem] items-center justify-between border-t border-line pt-1">
        <Circle className="size-6" />
        <Bone className="h-3.5 w-20" />
      </div>
    </div>
  );
}

/**
 * 홈: 큰 카드 하나(비시즌 MLB 도전·시즌 중 층 자리) + 비시즌 성적표(흰 카드 한 장 안 줄 목록, 맨 위 줄은 펼침).
 * 성적표 자리는 예전 '내 선수' 무대 카드 격자였는데, 성적표가 줄 목록으로 바뀌어(#286) 모양·높이가 달랐다(전수조사 L253).
 * 375px에서 실제 성적표 카드(1,046px)와 비슷한 높이(약 1,000px)다
 */
export function HomeSkeleton() {
  return (
    <Frame className="space-y-7">
      <section>
        <SectionTitle className="w-40" />
        <Bone white className="-mt-0.5 mb-2 ml-1 h-6 w-20" />
        <div className="card overflow-hidden p-4">
          <div className="-mx-4 -mt-4 h-[4.5rem] bg-surface-2" />
          <div className="-mt-8 flex items-end gap-3">
            <Circle className="size-[4.75rem] border-4 border-surface" />
            <div className="space-y-2 pb-1">
              <Bone className="h-6 w-20" />
              <Bone className="h-3.5 w-36" />
            </div>
          </div>
          <div className="mt-5 flex items-end justify-between gap-3">
            <div className="space-y-2">
              <Bone className="h-3 w-20" />
              <Bone className="h-11 w-28 rounded-lg" />
            </div>
            <div className="flex flex-col items-end space-y-2">
              <Bone className="h-4 w-32" />
              <Bone className="h-3 w-40" />
            </div>
          </div>
          <Bone className="mt-6 h-4 w-32" />
          <div className="mt-3 flex flex-wrap gap-2">
            {["w-28", "w-28", "w-24"].map((w, i) => (
              <Bone key={i} className={`h-8 ${w}`} />
            ))}
          </div>
          <div className="mt-6 space-y-5 border-t border-line pt-4">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <Bone className="h-3 w-32" />
                  <Bone className="h-4 w-full" />
                  <Bone className="h-4 w-3/4" />
                </div>
                <div className="h-[66px] w-[88px] shrink-0 rounded-xl bg-surface-2" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section>
        <SectionTitle className="w-40" />
        {/* 흐린 요약 한 줄('2027 개막 D-128 · …')과 오른쪽 '내 선수 n명 ›' */}
        <div className="-mt-0.5 mb-3 flex h-6 items-center justify-between gap-3 px-1">
          <Bone onPage className="h-3 w-48" />
          <Bone onPage className="h-3.5 w-20" />
        </div>
        <div className="card px-4 pb-1">
          {/* 목록 맨 위 흐린 안내('막대 = 4~9월 달마다 wRC+ · 줄을 누르면 펼쳐져요') */}
          <Line h="h-7 pt-2" bone="h-3 w-64" />
          <div className="divide-y divide-line">
            <ReportRowSkeleton lines={["w-40"]} second open />
            <ReportRowSkeleton lines={["w-28", "w-40"]} second />
            <ReportRowSkeleton lines={["w-32", "w-24", "w-36"]} />
            <ReportRowSkeleton lines={["w-28", "w-20", "w-40"]} />
            <ReportRowSkeleton lines={["w-36"]} second />
            <ReportRowSkeleton lines={["w-24", "w-40"]} second />
          </div>
        </div>
      </section>
    </Frame>
  );
}

/** 선수 목록(제목 '선수' 아래): 한 줄 설명 + 선수 카드 격자(사진·이름, 정보 칩, 숫자 셋) */
export function PlayersSkeleton() {
  return (
    <Frame className="space-y-4">
      <Bone onPage className="mx-1 h-5 w-32" />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="card p-4">
            <div className="flex items-center gap-3">
              <Circle className="size-14" />
              <div className="flex-1 space-y-2">
                <Bone className="h-[1.375rem] w-16" />
                <Bone className="h-3 w-28" />
              </div>
            </div>
            <div className="mt-3 flex gap-1.5">
              {["w-16", "w-24", "w-14", "w-[3.75rem]"].map((w) => (
                <Bone key={w} className={`h-7 ${w}`} />
              ))}
            </div>
            <div className="mt-3.5 border-t border-line pt-3">
              <Bone className="h-4 w-24" />
              <div className="mt-2 grid grid-cols-3">
                {[0, 1, 2].map((k) => (
                  <div key={k} className="space-y-1.5">
                    <Bone className="h-3 w-8" />
                    <Bone className="h-6 w-14 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/** 선수 화면: 팀 색 띠·96px 사진이 있는 머리 카드, 바로 가기 탭 줄, '시즌 성적'(큰 숫자 칸 넷 + 세부 기록 카드) */
export function PlayerSkeleton() {
  return (
    <Frame className="space-y-4 sm:space-y-5">
      <div className="card overflow-hidden">
        <div className="h-[68px] bg-surface-2" />
        <div className="-mt-11 px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="flex items-end justify-between gap-3">
            <Circle className="size-24 border-4 border-surface" />
            <Bone className="mb-1 h-8 w-[6.5rem]" />
          </div>
          <Bone className="mt-2 h-[1.875rem] w-24 rounded-lg" />
          <Bone className="mt-1.5 h-3 w-32" />
          <div className="mt-3 flex gap-1.5">
            {/* 칩 폭이 같은 것(w-16)이 둘이라 폭이 아니라 자리 번호를 key로 쓴다 */}
            {["w-16", "w-28", "w-14", "w-16"].map((w, i) => (
              <Bone key={i} className={`h-7 ${w}`} />
            ))}
          </div>
          <Bone className="mt-3 h-3.5 w-full" />
          <Bone className="mt-2 h-3.5 w-1/2" />
          <Bone className="mt-4 h-3 w-16" />
          <div className="mt-2 flex gap-1.5">
            <Bone className="h-7 w-36" />
            <Bone className="h-7 w-24" />
          </div>
        </div>
      </div>
      {/* 바로 가기 탭(PC에는 없다) */}
      <div className="flex gap-1.5 py-2 lg:hidden">
        {["w-[3.125rem]", "w-[3.125rem]", "w-[3.125rem]", "w-[3.875rem]", "w-[3.125rem]"].map((w, i) => (
          <Bone key={i} onPage className={`h-8 ${w}`} />
        ))}
      </div>
      <div className="pt-2 lg:max-w-[calc(100%-22.25rem)]">
        <SectionTitle className="w-36" />
        <Bone onPage className="mb-2.5 ml-1 h-4 w-24" />
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card space-y-2.5 px-4 py-3.5">
              <Bone className="h-3 w-10" />
              <Bone className="h-7 w-16 rounded-lg" />
            </div>
          ))}
        </div>
        <div className="card mt-2.5 grid grid-cols-4 gap-2 px-3 pb-3 pt-3.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center space-y-2">
              <Bone className="h-3 w-8" />
              <Bone className="h-6 w-10 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/** 뉴스 탭(제목 '뉴스' 아래): 선수 알약 줄(PC는 왼쪽 칸), 자주 나온 말 줄, 날짜 이름표 + 사진 있는 기사 줄 카드 */
export function NewsSkeleton() {
  return (
    <Frame className="space-y-3 lg:grid lg:grid-cols-[12rem_minmax(0,48rem)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-6 lg:gap-y-3 lg:space-y-0">
      <div className="flex gap-2 overflow-hidden py-1 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:flex-col">
        {["w-14", "w-[6.5rem]", "w-[6.5rem]", "w-[6.5rem]", "w-[6.5rem]"].map((w, i) => (
          <Bone key={i} white className={`h-10 shrink-0 lg:w-full ${w}`} />
        ))}
      </div>
      <div className="flex gap-1.5 overflow-hidden py-1 lg:col-start-2 lg:row-start-1">
        {["w-9", "w-[4.75rem]", "w-[3.625rem]", "w-16", "w-16"].map((w, i) => (
          <Bone key={i} onPage className={`h-9 shrink-0 ${w}`} />
        ))}
      </div>
      <div className="lg:col-start-2 lg:row-start-2">
        <Bone onPage className="mb-1.5 ml-1 h-4 w-10" />
        <div className="card divide-y divide-line px-4 py-1">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-3 py-3">
              <div className="flex-1 space-y-2">
                <Bone className="h-3 w-36" />
                <Bone className="h-4 w-full" />
                <Bone className="h-4 w-2/3" />
              </div>
              <div className="h-[66px] w-[88px] shrink-0 rounded-xl bg-surface-2" />
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/** 기사 한 건: 카드 안 제목 세 줄, 출처 줄, 2:1 사진(640px 이상 288px), 요약 본문, 원문 보기 버튼 */
export function ArticleSkeleton() {
  return (
    <Frame className="mx-auto max-w-2xl">
      <div className="card p-4 sm:p-6">
        <div className="space-y-2.5">
          <Bone className="h-5 w-full" />
          <Bone className="h-5 w-full" />
          <Bone className="h-5 w-2/3" />
        </div>
        <Bone className="mt-3.5 h-3.5 w-48" />
        <div className="mt-3 aspect-[2/1] rounded-xl bg-surface-2 sm:aspect-auto sm:h-72" />
        <div className="mt-4 space-y-3">
          {["w-full", "w-full", "w-11/12", "w-full", "w-2/3", "w-full", "w-full", "w-1/2"].map((w, i) => (
            <Bone key={i} className={`h-4 ${w}`} />
          ))}
        </div>
        <div className="mt-5 h-11 rounded-xl bg-surface-2" />
      </div>
    </Frame>
  );
}

/**
 * 내 선수: 제목 줄('내 선수' + 아래 한 줄 + 오른쪽 '선수 고르기')과 카드 격자. 제목은 데이터 머리 줄(MyHeader) 안에 있어서,
 * 뼈대도 같은 자리에 진짜 제목을 그린다(회색 막대로 두면 첫 화면에 제목이 없었다). 오면 MyHeader의 같은 제목으로 바뀐다
 */
export function MySkeleton() {
  return (
    <div className="min-h-[100dvh] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2 px-1">
        <div className="min-w-0 flex-1 basis-[5rem]">
          <h1 className="text-display">내 선수</h1>
          <Bone onPage className="mt-1.5 h-3.5 w-48 animate-pulse motion-reduce:animate-none" />
        </div>
        <Bone white className="h-8 w-[6.5rem] animate-pulse motion-reduce:animate-none" />
      </div>
      <Frame className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StageCard />
        <StageCard />
        <StageCard />
      </Frame>
    </div>
  );
}

/** 기록 탭(제목 '기록' 아래): 한 줄 설명 + 섹션마다 제목과 선수 줄 카드(PC 두 칸) */
export function RecordsSkeleton() {
  return (
    <Frame className="space-y-4">
      <Bone onPage className="mx-1 h-5 w-40" />
      <div className="space-y-7 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6 lg:space-y-0">
        {[5, 6].map((rows) => (
          <section key={rows}>
            <SectionTitle className="w-40" />
            <div className="card divide-y divide-line overflow-hidden">
              {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
                  <Circle className="size-11" />
                  <div className="flex-1 space-y-2">
                    <Bone className="h-4 w-20" />
                    <Bone className="h-3 w-36" />
                  </div>
                  <Bone className="h-6 w-12 rounded-lg" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Frame>
  );
}
