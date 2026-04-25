import { useMemo } from 'react';
import { cn } from '@/utils/cn';

export type IntDiffFieldKind = 'pills' | 'bool' | 'number' | 'text';

export interface IntDiffField<T> {
  key: keyof T;
  label: string;
  kind: IntDiffFieldKind;
}

export type IntDiffMode = 'all' | 'only-differing';

export interface IntMetadataDiffProps<T> {
  items: T[];
  fields: IntDiffField<T>[];
  mode: IntDiffMode;

  onModeChange?: (mode: IntDiffMode) => void;

  className?: string;
}

function normalize(value: unknown): string {
  if (Array.isArray(value)) return [...value].map(String).sort().join('|');
  if (value == null) return '∅';
  return String(value);
}

function diffState<T>(items: T[], key: keyof T): 'agree' | 'differ' {
  const seen = new Set(items.map((i) => normalize(i[key])));
  return seen.size === 1 ? 'agree' : 'differ';
}

function renderValue(value: unknown, kind: IntDiffFieldKind) {
  if (value == null || (Array.isArray(value) && value.length === 0)) {
    return <span className="adm-metadiff-cell-pill adm-metadiff-cell-pill--miss">—</span>;
  }
  if (kind === 'pills') {
    const arr = Array.isArray(value) ? value : [value];
    return (
      <div className="adm-metadiff-cell-pills">
        {arr.map((v, i) => (
          <span key={i} className="adm-metadiff-cell-pill">
            {String(v)}
          </span>
        ))}
      </div>
    );
  }
  if (kind === 'bool') {
    return <span className="adm-metadiff-cell-pill">{value ? 'Yes' : 'No'}</span>;
  }
  if (kind === 'number') {
    return (
      <span
        style={{
          fontFamily: "'SF Mono', 'Consolas', ui-monospace, monospace",
          fontSize: 12,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {Number(value).toLocaleString()}
      </span>
    );
  }
  return <span>{String(value)}</span>;
}

export function IntMetadataDiff<T>({
  items,
  fields,
  mode,
  onModeChange,
  className,
}: IntMetadataDiffProps<T>) {
  const annotated = useMemo(
    () =>
      fields.map((f) => ({
        ...f,
        state: diffState(items, f.key) as 'agree' | 'differ',
      })),
    [fields, items]
  );
  const visible = useMemo(
    () => annotated.filter((f) => mode === 'all' || f.state === 'differ'),
    [annotated, mode]
  );

  const modeToggle = onModeChange ? (
    <div className="adm-metadiff-mode-toggle">
      <button
        className={cn('adm-pill', mode === 'all' && 'active')}
        onClick={() => onModeChange('all')}
        type="button"
        aria-pressed={mode === 'all'}
      >
        All fields
      </button>
      <button
        className={cn('adm-pill', mode === 'only-differing' && 'active')}
        onClick={() => onModeChange('only-differing')}
        type="button"
        aria-pressed={mode === 'only-differing'}
      >
        Only differing
      </button>
    </div>
  ) : null;

  if (visible.length === 0) {
    return (
      <div className={cn('adm-metadiff', className)}>
        <div className="adm-metadiff-head">
          <span>No differing metadata across these lessons.</span>
          {modeToggle}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('adm-metadiff', className)}>
      <div className="adm-metadiff-head">
        <span>
          {visible.length} field{visible.length === 1 ? '' : 's'}
        </span>
        {modeToggle}
        <span className="legend">
          <span className="agree">
            <span className="swatch" />
            Agrees
          </span>
          <span className="differ">
            <span className="swatch" />
            Differs
          </span>
        </span>
      </div>
      <div className="adm-metadiff-table">
        {visible.map((f) => (
          <div key={String(f.key)} className={cn('adm-metadiff-row', f.state)}>
            <div className="adm-metadiff-row-head">
              <span className="adm-metadiff-row-key">{f.label}</span>
              <span className={cn('adm-metadiff-row-state', f.state)}>
                {f.state === 'differ' ? '△ differs' : '✓ agrees'}
              </span>
            </div>
            <div
              className="adm-metadiff-values"
              style={{ gridTemplateColumns: `repeat(${items.length}, minmax(180px, 1fr))` }}
            >
              {items.map((item, idx) => (
                <div key={idx} className="adm-metadiff-cell">
                  {renderValue(item[f.key], f.kind)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
