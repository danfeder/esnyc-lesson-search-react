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
  return (
    <div className="adm-subnav" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={tab.disabled || undefined}
            disabled={tab.disabled}
            className={cn('adm-subnav-tab', isActive && 'active')}
            onClick={() => !tab.disabled && onChange(tab.key)}
          >
            {tab.label}
            {typeof tab.count === 'number' && <span className="adm-subnav-count">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
