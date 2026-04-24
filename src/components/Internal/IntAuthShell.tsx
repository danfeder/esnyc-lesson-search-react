import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface IntAuthShellProps {
  /** Small uppercase eyebrow shown above the title (e.g. inviting organization). */
  eyebrow?: string;
  /** Page title rendered inside the card header. */
  title: string;
  /** Optional subtitle/description under the title. */
  description?: ReactNode;
  /** Card body — form, status content, etc. */
  children: ReactNode;
  /** Optional footer slot rendered inside the card, below the body (e.g. "Back to home" link). */
  footer?: ReactNode;
  /** Wider card variant (for forms with many fields). Default: standard (~480px). */
  width?: 'narrow' | 'wide';
  /** Visual emphasis for the decorative icon circle above the title. */
  tone?: 'neutral' | 'green' | 'red' | 'amber';
  /** Optional icon rendered in the header circle. */
  icon?: ReactNode;
  /** Optional caption rendered below the card (e.g. "Need help? Contact support"). */
  caption?: ReactNode;
}

/**
 * Pre-auth page shell used by AcceptInvitation, ResetPassword, and any future
 * public auth flow. Renders a centered card on the paper backdrop. Not wrapped
 * in `int-shell-root` — these pages run outside the internal topbar/subnav.
 */
export function IntAuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  width = 'narrow',
  tone = 'neutral',
  icon,
  caption,
}: IntAuthShellProps) {
  return (
    <div className="adm-auth-page">
      <div className={cn('adm-auth-shell', width === 'wide' && 'adm-auth-shell--wide')}>
        <div className="adm-auth-brand">
          <span className="adm-auth-brand-mark" aria-hidden="true">
            ESY
          </span>
          <span className="adm-auth-brand-label">Edible Schoolyard NYC · Lesson Library</span>
        </div>

        <div className="adm-auth-card">
          <div className="adm-auth-card-head">
            {icon && (
              <div
                className={cn(
                  'adm-auth-icon',
                  tone === 'green' && 'adm-auth-icon--green',
                  tone === 'red' && 'adm-auth-icon--red',
                  tone === 'amber' && 'adm-auth-icon--amber'
                )}
                aria-hidden="true"
              >
                {icon}
              </div>
            )}
            {eyebrow && <p className="adm-auth-eyebrow">{eyebrow}</p>}
            <h1 className="adm-auth-title">{title}</h1>
            {description && <p className="adm-auth-desc">{description}</p>}
          </div>

          <div className="adm-auth-card-body">{children}</div>

          {footer && <div className="adm-auth-card-footer">{footer}</div>}
        </div>

        {caption && <p className="adm-auth-caption">{caption}</p>}
      </div>
    </div>
  );
}
