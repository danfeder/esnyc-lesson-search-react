import type { ReactNode } from 'react';

interface IntDecisionBarProps {
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
        {eyebrow && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--color-esy-ink-50)',
              fontFamily: 'var(--esy-font-display)',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {eyebrow}
          </div>
        )}
        {detail && <div style={{ fontSize: 13, marginTop: 2 }}>{detail}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>{children}</div>
    </div>
  );
}
