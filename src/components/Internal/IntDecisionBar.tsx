import type { ReactNode } from 'react';

export interface IntDecisionBarProps {
  /** Eyebrow on the left side, e.g. "Assigned to". */
  eyebrow?: string;
  /** Detail text under the eyebrow, e.g. "M. Rivera (you)". */
  detail?: ReactNode;
  /** Action buttons on the right (typically <IntButton> elements). */
  children: ReactNode;
}

export function IntDecisionBar({ eyebrow, detail, children }: IntDecisionBarProps) {
  return (
    <div className="adm-decision-bar">
      <div>
        {eyebrow && <div className="adm-decision-bar__eyebrow">{eyebrow}</div>}
        {detail && <div style={{ fontSize: 13, marginTop: 2 }}>{detail}</div>}
      </div>
      <div className="adm-decision-bar__actions">{children}</div>
    </div>
  );
}
