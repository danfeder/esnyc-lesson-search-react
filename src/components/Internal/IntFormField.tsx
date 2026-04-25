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
  const fieldId = htmlFor ?? generatedId;

  // If children is a single element without an id, inject our fieldId so the
  // <label htmlFor> wires up correctly for screen readers.
  let renderedChild = children;
  if (isValidElement(children)) {
    const childProps = children.props as { id?: string };
    if (!childProps.id) {
      renderedChild = cloneElement(children, { id: fieldId } as Partial<typeof childProps>);
    }
  }

  return (
    <div className="adm-field">
      <label htmlFor={fieldId} className={cn('adm-label', required && 'adm-label-req')}>
        {label}
      </label>
      {renderedChild}
      {error ? (
        <p className={cn('adm-hint', 'adm-hint--error')}>{error}</p>
      ) : hint ? (
        <p className="adm-hint">{hint}</p>
      ) : null}
    </div>
  );
}
