import type { ReactNode } from 'react';

export interface IntStatRowProps {
  children: ReactNode;
}

export function IntStatRow({ children }: IntStatRowProps) {
  return <div className="adm-stat-row">{children}</div>;
}
