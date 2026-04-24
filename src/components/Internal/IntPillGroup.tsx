import { cn } from '@/utils/cn';

export interface IntPillOption {
  value: string;
  label: string;
}

export interface IntPillGroupProps {
  options: IntPillOption[];
  selected: string[];

  onChange: (next: string[]) => void;
  variant?: 'green' | 'ink';
  /** 'multi' (default): toggles each pill independently. 'single': click replaces selection; click active pill clears it. */
  mode?: 'multi' | 'single';
  ariaLabel?: string;
  /** Applied to the wrapping element so a sibling <label htmlFor> resolves. */
  id?: string;
  disabled?: boolean;
}

export function IntPillGroup({
  options,
  selected,
  onChange,
  variant = 'ink',
  mode = 'multi',
  ariaLabel,
  id,
  disabled,
}: IntPillGroupProps) {
  const toggle = (value: string) => {
    if (disabled) return;
    const isActive = selected.includes(value);
    if (mode === 'single') {
      onChange(isActive ? [] : [value]);
      return;
    }
    onChange(isActive ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  return (
    <div id={id} className="adm-pill-group" role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            className={cn('adm-pill', variant === 'green' && 'adm-pill--green', active && 'active')}
            onClick={() => toggle(opt.value)}
            aria-pressed={active}
            disabled={disabled}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
