import { Link } from 'react-router-dom';

export interface IntHubTileProps {
  eyebrow: string;
  title: string;
  description: string;
  to: string;
  footerStat?: { label: string; value: string | number };
}

export function IntHubTile({ eyebrow, title, description, to, footerStat }: IntHubTileProps) {
  return (
    <Link to={to} className="adm-hub-tile" aria-label={title}>
      <div className="adm-hub-tile-eyebrow">{eyebrow}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {footerStat && (
        <div className="adm-hub-tile-footer">
          <span>{footerStat.label}</span>
          <strong>{footerStat.value}</strong>
        </div>
      )}
    </Link>
  );
}
