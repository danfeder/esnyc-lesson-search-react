import { cn } from '@/utils/cn';

export type IntConfidence = 'high' | 'medium' | 'low';

export interface IntConfidencePillProps {
  confidence: IntConfidence;
  className?: string;
}

export function IntConfidencePill({ confidence, className }: IntConfidencePillProps) {
  return (
    <span className={cn('adm-confidence-pill', `adm-confidence-pill--${confidence}`, className)}>
      {confidence}
    </span>
  );
}
