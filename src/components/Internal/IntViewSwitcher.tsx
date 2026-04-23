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
}

export function IntViewSwitcher({ value, onChange }: IntViewSwitcherProps) {
  return (
    <div className="int-switch" role="radiogroup" aria-label="Result view">
      {OPTIONS.map((option) => (
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
