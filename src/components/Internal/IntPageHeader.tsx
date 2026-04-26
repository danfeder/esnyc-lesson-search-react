import type { ReactNode } from 'react';

interface IntPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  back?: { label: string; onClick: () => void };
}

export function IntPageHeader({ title, description, actions, back }: IntPageHeaderProps) {
  return (
    <div className="adm-page-head">
      <div>
        {back && (
          <button type="button" className="adm-back" onClick={back.onClick}>
            <span aria-hidden="true">← </span>
            {back.label}
          </button>
        )}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="adm-page-head-actions">{actions}</div>}
    </div>
  );
}
