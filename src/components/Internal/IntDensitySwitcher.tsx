import { cn } from '@/utils/cn';
import type { ResultDensity, ResultView } from '@/types';

const OPTIONS: { value: ResultDensity; label: string }[] = [
  { value: 'comfy', label: 'Comfy' },
  { value: 'compact', label: 'Compact' },
  { value: 'ultra', label: 'Ultra' },
];

interface IntDensitySwitcherProps {
  value: ResultDensity;
  view: ResultView;
  onChange: (density: ResultDensity) => void;
}

export function IntDensitySwitcher({ value, view, onChange }: IntDensitySwitcherProps) {
  // Density variants only affect list-view rows; hide for grid/split.
  if (view !== 'list') return null;

  return (
    <div className="int-switch" role="radiogroup" aria-label="List density">
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
