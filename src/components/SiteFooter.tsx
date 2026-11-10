import ExternalLinkIcon from "./ExternalLinkIcon";

/** MLB 데이터에 붙여야 하는 공식 이용 고지 */
const MLB_NOTICE_URL = "http://gdx.mlb.com/components/copyright.txt";

export default function SiteFooter() {
  return (
    <footer>
      <div className="mx-auto max-w-[67.5rem] space-y-1 px-4 pb-8 pt-2 text-center text-xs text-muted sm:px-6">
        <p>
          데이터: MLB Stats API · 개인적·비상업적 용도로만 씁니다 ·{" "}
          <a
            href={MLB_NOTICE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-foreground"
          >
            MLB 이용 고지
            <ExternalLinkIcon />
            <span className="sr-only"> (새 탭에서 열림)</span>
          </a>
        </p>
        <p>이 사이트는 MLB 및 구단과 관계가 없습니다. 기록, 선수 사진과 팀 로고의 권리는 MLB와 각 구단에 있습니다.</p>
      </div>
    </footer>
  );
}
