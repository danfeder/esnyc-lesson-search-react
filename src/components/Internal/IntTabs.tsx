import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/utils/cn';

export interface IntTab {
  key: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface IntTabsProps {
  tabs: IntTab[];
  activeKey: string;
  onChange: (key: string) => void;
  ariaLabel?: string;
}

export function IntTabs({ tabs, activeKey, onChange, ariaLabel }: IntTabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusTabAt = (index: number) => {
    const total = tabs.length;
    if (total === 0) return;
    let i = ((index % total) + total) % total;
    // Skip disabled tabs by walking forward; bail if every tab is disabled.
    for (let attempts = 0; attempts < total; attempts++) {
      const candidate = tabs[i];
      if (!candidate.disabled) {
        const node = tabRefs.current[i];
        if (node) {
          node.focus();
          onChange(candidate.key);
        }
        return;
      }
      i = (i + 1) % total;
    }
  };

  // Automatic-activation tablist: arrow keys both move focus AND activate the
  // tab (per WAI-ARIA APG "Tabs with Automatic Activation"). All current
  // consumers swap cheap local state on tab change; do not adopt this primitive
  // for tabs whose activation triggers expensive fetches.
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        focusTabAt(index + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        focusTabAt(index - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusTabAt(0);
        break;
      case 'End':
        e.preventDefault();
        focusTabAt(tabs.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div className="adm-subnav" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab, index) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={tab.disabled || undefined}
            disabled={tab.disabled}
            // Roving tabindex: only the active tab is in the tab order. Arrow
            // keys move focus between tabs per WAI-ARIA tablist contract.
            tabIndex={isActive ? 0 : -1}
            className={cn('adm-subnav-tab', isActive && 'active')}
            onClick={() => !tab.disabled && onChange(tab.key)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {tab.label}
            {typeof tab.count === 'number' && <span className="adm-subnav-count">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
