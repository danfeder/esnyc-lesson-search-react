import { useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface IntFilterSectionProps {
  label: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function IntFilterSection({
  label,
  count = 0,
  defaultOpen = false,
  children,
}: IntFilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn('int-filter', open && 'open')}>
      <button
        type="button"
        className="int-filter-head"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span className="int-filter-head-left">
          <span>{label}</span>
          {count > 0 && <span className="int-filter-count">{count}</span>}
        </span>
        <svg
          className="int-filter-chev"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      {open && <div className="int-filter-body">{children}</div>}
    </div>
  );
}
