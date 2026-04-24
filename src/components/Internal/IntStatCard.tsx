export interface IntStatCardProps {
  label: string;
  value: string | number;
  delta?: { text: string; direction?: 'up' | 'down' | 'neutral' };
}

export function IntStatCard({ label, value, delta }: IntStatCardProps) {
  const deltaClass =
    delta?.direction === 'up'
      ? 'adm-stat-delta adm-stat-delta--up'
      : delta?.direction === 'down'
        ? 'adm-stat-delta adm-stat-delta--down'
        : 'adm-stat-delta';

  return (
    <div className="adm-stat">
      <span className="adm-stat-label">{label}</span>
      <span className="adm-stat-value">{value}</span>
      {delta && <span className={deltaClass}>{delta.text}</span>}
    </div>
  );
}
