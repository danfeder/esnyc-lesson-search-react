interface IntProgressBarProps {
  filled: number;
  total: number;
  label?: string;
}

export function IntProgressBar({ filled, total, label }: IntProgressBarProps) {
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
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={filled}
      >
        <div className="adm-progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span style={{ fontSize: 11 }}>{tail}</span>
    </div>
  );
}
