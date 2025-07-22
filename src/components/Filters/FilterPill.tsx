import React from 'react';
import { X } from 'lucide-react';
import { formatCategoryName } from '../../utils/filterUtils';

interface FilterPillProps {
  category: string;
  value: string;
  onRemove: () => void;
}

export const FilterPill = React.memo<FilterPillProps>(({ category, value, onRemove }) => {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-primary-100 text-primary-800 hover:bg-primary-200 transition-colors group">
      <span className="text-primary-600">{formatCategoryName(category)}:</span>
      <span>{value}</span>
      <button
        onClick={onRemove}
        className="ml-1 p-0.5 rounded-full hover:bg-primary-300 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
        aria-label={`Remove ${formatCategoryName(category)} filter: ${value}`}
      >
        <X className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </span>
  );
});
