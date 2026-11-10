/** 데이터를 받는 동안 보여 주는 회색 자리 표시 */
export default function LoadingBlock({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" className="card p-4">
      <span className="sr-only">불러오는 중</span>
      <div aria-hidden className="animate-pulse space-y-3">
        <div className="h-4 w-1/3 rounded-full bg-surface-2" />
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="h-3 rounded-full bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
