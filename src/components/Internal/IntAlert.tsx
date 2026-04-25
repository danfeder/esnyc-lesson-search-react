import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/utils/cn';

export type IntAlertVariant = 'error' | 'warn' | 'info' | 'success';

export interface IntAlertProps {
  variant: IntAlertVariant;
  title?: string;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

const DEFAULT_ICON: Record<IntAlertVariant, ReactNode> = {
  error: <AlertCircle size={14} aria-hidden="true" />,
  warn: <AlertTriangle size={14} aria-hidden="true" />,
  info: <Info size={14} aria-hidden="true" />,
  success: <CheckCircle2 size={14} aria-hidden="true" />,
};

const ROLE: Record<IntAlertVariant, 'alert' | 'status'> = {
  error: 'alert',
  warn: 'alert',
  info: 'status',
  success: 'status',
};

// Some assistive technologies don't always honor implicit live-region
// semantics for conditionally-mounted role="alert"/"status" elements.
// Set aria-live explicitly for robust announcements.
const ARIA_LIVE: Record<IntAlertVariant, 'assertive' | 'polite'> = {
  error: 'assertive',
  warn: 'assertive',
  info: 'polite',
  success: 'polite',
};

export function IntAlert({ variant, title, children, icon, className }: IntAlertProps) {
  return (
    <div
      role={ROLE[variant]}
      aria-live={ARIA_LIVE[variant]}
      className={cn('adm-alert', `adm-alert--${variant}`, className)}
    >
      <span className="adm-alert-icon">{icon ?? DEFAULT_ICON[variant]}</span>
      <div className="adm-alert-body">
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </div>
  );
}
