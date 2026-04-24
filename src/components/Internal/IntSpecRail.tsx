import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface IntSpecRailProps {
  pair?: boolean;
  className?: string;
  children: ReactNode;
}

export function IntSpecRail({ pair = false, className, children }: IntSpecRailProps) {
  return (
    <div className={cn('adm-spec-rail', pair && 'adm-spec-rail--pair', className)}>{children}</div>
  );
}
