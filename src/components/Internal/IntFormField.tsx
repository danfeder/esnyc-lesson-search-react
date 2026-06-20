import { useId, type ReactNode, cloneElement, isValidElement } from 'react';
import { cn } from '@/utils/cn';

interface IntFormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  /** Optional explicit id; otherwise auto-generated and applied to the child input. */
  htmlFor?: string;
  /** The input/textarea/select. If a single element is passed and it lacks an id,
      the field's id is wired in for label association. Strings, fragments, and
      arrays are rendered as-is. */
  children: ReactNode;
}

export function IntFormField({
  label,
  required,
  hint,
  error,
  htmlFor,
  children,
}: IntFormFieldProps) {
  const generatedId = useId();

  // A single valid-element child is the only case we can wire control-level
  // ARIA onto. Strings, fragments, and arrays are rendered as-is.
  const singleChild = isValidElement(children) ? children : null;
  const childProps = singleChild
    ? (singleChild.props as { id?: string; 'aria-describedby'?: string })
    : null;

  // Prefer an explicit htmlFor, then the child's own id, then a generated one,
  // so explicit-id children still wire up label/describedby correctly.
  const fieldId = htmlFor ?? childProps?.id ?? generatedId;

  // Stable id for the hint/error <p> (harmless even when nothing references it).
  const descId = `${fieldId}-desc`;
  const hasDescription = Boolean(error || hint);

  // If a single element child is passed, wire in the field id (when it lacks
  // one) plus required/invalid state and a describedby link to the hint/error.
  let renderedChild = children;
  if (singleChild && childProps) {
    const describedByIds = [childProps['aria-describedby'], hasDescription ? descId : undefined]
      .filter(Boolean)
      .join(' ');

    renderedChild = cloneElement(singleChild, {
      ...(childProps.id ? {} : { id: fieldId }),
      'aria-required': required || undefined,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': describedByIds || undefined,
    } as Partial<typeof childProps>);
  }

  return (
    <div className="adm-field">
      <label htmlFor={fieldId} className={cn('adm-label', required && 'adm-label-req')}>
        {label}
      </label>
      {renderedChild}
      {error ? (
        <p id={descId} className={cn('adm-hint', 'adm-hint--error')}>
          {error}
        </p>
      ) : hint ? (
        <p id={descId} className="adm-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
