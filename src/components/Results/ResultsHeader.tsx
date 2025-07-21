import React from 'react';
import { Download, SortAsc } from 'lucide-react';

interface ResultsHeaderProps {
  totalCount: number;
  currentQuery: string;
  sortBy: string;
  // eslint-disable-next-line no-unused-vars
  onSortChange: (sort: string) => void;
  onExport: () => void;
}

export const ResultsHeader: React.FC<ResultsHeaderProps> = ({
  totalCount,
  currentQuery,
  sortBy,
  onSortChange,
  onExport,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        {/* Results Info */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            <span className="text-primary-600">{totalCount.toLocaleString()}</span> lessons found
          </h2>
          {currentQuery && (
            <p className="text-gray-600 mt-1">
              Results for "<span className="font-medium">{currentQuery}</span>"
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-4">
          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              aria-label="Sort results"
            >
              <option value="relevance">Sort by Relevance</option>
              <option value="title">Sort by Title</option>
              <option value="confidence">Sort by Confidence</option>
              <option value="grade">Sort by Grade Level</option>
              <option value="modified">Sort by Last Modified</option>
            </select>
            <SortAsc className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Export Button */}
          <button onClick={onExport} className="btn-secondary flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
};
