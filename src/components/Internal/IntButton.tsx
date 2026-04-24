import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type IntButtonVariant = 'default' | 'primary' | 'ink' | 'danger' | 'ghost';
type IntButtonSize = 'sm' | 'md' | 'lg';

interface IntButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IntButtonVariant;
  size?: IntButtonSize;
}

export function IntButton({
  variant = 'default',
  size = 'md',
  className,
  type = 'button',
  children,
  ...rest
}: IntButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'adm-btn',
        variant === 'primary' && 'adm-btn--primary',
        variant === 'ink' && 'adm-btn--ink',
        variant === 'danger' && 'adm-btn--danger',
        variant === 'ghost' && 'adm-btn--ghost',
        size === 'sm' && 'adm-btn--sm',
        size === 'lg' && 'adm-btn--lg',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
