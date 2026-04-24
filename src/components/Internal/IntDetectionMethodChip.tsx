import { cn } from '@/utils/cn';

export type IntDetectionMethod = 'both' | 'same_title' | 'embedding' | 'mixed';

export interface IntDetectionMethodChipProps {
  method: IntDetectionMethod;
  className?: string;
}

const LABELS: Record<IntDetectionMethod, string> = {
  both: 'both',
  same_title: 'same title',
  embedding: 'embedding',
  mixed: 'mixed',
};

export function IntDetectionMethodChip({ method, className }: IntDetectionMethodChipProps) {
  return (
    <span className={cn('adm-method-chip', `adm-method-chip--${method}`, className)}>
      {LABELS[method]}
    </span>
  );
}
