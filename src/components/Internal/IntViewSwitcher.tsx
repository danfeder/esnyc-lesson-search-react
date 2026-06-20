import { cn } from '@/utils/cn';
import type { ResultView } from '@/types';

const OPTIONS: { value: ResultView; label: string }[] = [
  { value: 'list', label: 'List' },
  { value: 'grid', label: 'Cards' },
  { value: 'split', label: 'Split' },
];

interface IntViewSwitcherProps {
  value: ResultView;
  onChange: (view: ResultView) => void;
  /**
   * §3.4: Split is a desktop-only affordance (the detail rail is CSS-hidden
   * below 1100px). When false, the Split option is omitted so narrow users
   * can't pick a dead-end view. Defaults to true.
   */
  allowSplit?: boolean;
}

export function IntViewSwitcher({ value, onChange, allowSplit = true }: IntViewSwitcherProps) {
  const options = allowSplit ? OPTIONS : OPTIONS.filter((option) => option.value !== 'split');
  return (
    <div className="int-switch" role="radiogroup" aria-label="Result view">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={cn(value === option.value && 'active')}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
