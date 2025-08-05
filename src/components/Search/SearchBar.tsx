import React, { useState, useCallback, useEffect } from 'react';
import { Search, X, Lightbulb } from 'lucide-react';
import { useSearchStore } from '../../stores/searchStore';
import { useSearch } from '../../hooks/useSearch';
import { debounce } from '../../utils/debounce';

export const SearchBar: React.FC = () => {
  const { filters, setFilters } = useSearchStore();
  const [localQuery, setLocalQuery] = useState(filters.query);

  // Sync local state with external filter changes
  useEffect(() => {
    setLocalQuery(filters.query);
  }, [filters.query]);

  // Get search results to show suggestions when no results found
  const { data: searchResults } = useSearch({
    filters,
    enabled: !!filters.query.trim(),
    limit: 5, // Limit for testing
  });

  // Debounced search to avoid too many API calls
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setFilters({ query });
    }, 300),
    [setFilters]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalQuery(value);
    debouncedSearch(value);
  };

  const handleClear = () => {
    setLocalQuery('');
    setFilters({ query: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ query: localQuery });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-6 w-6 h-6 text-gray-400" />

            <input
              type="text"
              value={localQuery}
              onChange={handleInputChange}
              placeholder="Search lessons by keyword, title, ingredient, skill, or topic..."
              className="w-full pl-16 pr-16 py-4 text-lg border-2 border-gray-200 rounded-full focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all duration-200 bg-gray-50 focus:bg-white"
              aria-label="Search lessons"
            />

            {localQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-16 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <button type="submit" className="absolute right-2 btn-primary py-3 px-6">
              Search
            </button>
          </div>
        </form>

        {/* Search Suggestions */}
        {searchResults?.suggestions && searchResults.suggestions.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-2">
                  No results found. Try these suggestions:
                </p>
                <div className="flex flex-wrap gap-2">
                  {searchResults.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setLocalQuery(suggestion);
                        setFilters({ query: suggestion });
                      }}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Search Suggestions */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-600 font-medium">Quick searches:</span>
          {[
            "women's history",
            'thanksgiving',
            'winter vegetables',
            'hispanic heritage',
            'cooking skills',
            'middle school',
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => {
                setLocalQuery(suggestion);
                setFilters({ query: suggestion });
              }}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-primary-100 hover:text-primary-700 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
