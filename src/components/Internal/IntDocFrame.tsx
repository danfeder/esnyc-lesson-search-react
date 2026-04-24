import type { ReactNode } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import { cn } from '@/utils/cn';

interface IntDocFrameToggleOption {
  value: string;
  label: string;
}

interface IntDocFrameProps {
  fileName?: string;
  externalHref?: string;
  externalLabel?: string;
  toggle?: {
    options: IntDocFrameToggleOption[];
    value: string;

    onChange: (value: string) => void;
  };
  /** When true, wraps children in the padded .adm-doc-body scroll container. */
  padded?: boolean;
  children: ReactNode;
}

export function IntDocFrame({
  fileName,
  externalHref,
  externalLabel = 'Open in Docs',
  toggle,
  padded = false,
  children,
}: IntDocFrameProps) {
  return (
    <div className="adm-doc-frame">
      <div className="adm-doc-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <FileText size={13} aria-hidden />
          {fileName && (
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fileName}
            </span>
          )}
          {externalHref && (
            <a
              href={externalHref}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--color-esy-green)',
                fontSize: 11,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              {externalLabel} <ExternalLink size={10} aria-hidden />
            </a>
          )}
        </div>
        {toggle && (
          <div className="adm-doc-toggle" role="tablist" aria-label="Document view">
            {toggle.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={toggle.value === opt.value}
                className={cn(toggle.value === opt.value && 'active')}
                onClick={() => toggle.onChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {padded ? <div className="adm-doc-body">{children}</div> : children}
    </div>
  );
}
