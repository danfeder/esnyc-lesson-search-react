interface IntEmptyStateProps {
  title?: string;
  hint?: string;
}

export function IntEmptyState({
  title = 'No results',
  hint = 'Try removing a filter or broadening your search.',
}: IntEmptyStateProps) {
  return (
    <div className="int-empty">
      <h3>{title}</h3>
      <p>{hint}</p>
    </div>
  );
}
