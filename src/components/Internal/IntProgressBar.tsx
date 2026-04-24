export interface IntProgressBarProps {
  filled: number;
  total: number;
  label?: string;
  ariaLabel?: string;
}

export function IntProgressBar({ filled, total, label, ariaLabel }: IntProgressBarProps) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  const remaining = Math.max(0, total - filled);
  const tail = label ?? (remaining === 0 ? 'Complete' : `${remaining} to go`);

  return (
    <div className="adm-progress">
      <span className="adm-progress-count">
        {filled}/{total}
      </span>
      <div
        className="adm-progress-bar"
        role="progressbar"
        aria-label={ariaLabel ?? 'Completion'}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={filled}
        aria-valuetext={`${filled} of ${total} — ${tail}`}
      >
        <div className="adm-progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="adm-progress-tail">{tail}</span>
    </div>
  );
}
