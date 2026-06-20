interface IntListSkeletonProps {
  /** How many placeholder rows to render. Defaults to a typical first page. */
  rows?: number;
}

/**
 * Cold-load placeholder for the lesson list. Mirrors the `IntListRow` grid
 * shape (grades · main · right) so the layout doesn't jump when real rows
 * arrive. Tokened with `int-*` classes + the `.int-skeleton` shimmer (design
 * cohesion — no legacy gray Tailwind animate-pulse on the int-* surface).
 *
 * Rendered only while the search is genuinely pending (cold load); with
 * `placeholderData: keepPreviousData`, a refetch keeps the prior rows instead.
 */
export function IntListSkeleton({ rows = 8 }: IntListSkeletonProps) {
  return (
    // role="status" announces via its text content (the sr-only span below).
    // No aria-label — it would be a redundant accessible name and some screen
    // readers announce both the name and the content (double-announcement).
    <div className="int-list" role="status" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="int-list-row" key={i} aria-hidden="true">
          <div className="int-row-grades">
            <span className="int-skeleton int-skeleton-grade" />
          </div>
          <div className="int-row-main">
            <span className="int-skeleton int-skeleton-title" />
            <span className="int-skeleton int-skeleton-summary" />
            <span className="int-skeleton int-skeleton-meta" />
          </div>
          <div className="int-row-right">
            <span className="int-skeleton int-skeleton-open" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading lessons…</span>
    </div>
  );
}
