import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

export interface LessonSearchResult {
  lesson_id: string;
  title: string;
  grade_levels?: string[] | null;
  season_timing?: string[] | null;
}

interface LessonSearchPickerProps {
  selected: LessonSearchResult | null;

  onSelect: (lesson: LessonSearchResult) => void;
  onClear: () => void;
  cantFindOption?: boolean;
  onCantFind?: () => void;
}

const DEBOUNCE_MS = 300;
const MAX_RESULTS = 10;

export function LessonSearchPicker({
  selected,
  onSelect,
  onClear,
  cantFindOption = false,
  onCantFind,
}: LessonSearchPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LessonSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const runSearch = useCallback(async (q: string) => {
    const myRequestId = ++requestIdRef.current;
    if (!q.trim()) {
      setResults([]);
      setHasQueried(false);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('lesson_id, title, grade_levels, season_timing')
        .ilike('title', `%${q}%`)
        .order('title', { ascending: true })
        .limit(MAX_RESULTS);
      if (myRequestId !== requestIdRef.current) return;
      if (error) throw error;
      setResults((data ?? []) as LessonSearchResult[]);
      setHasQueried(true);
    } catch (err) {
      if (myRequestId !== requestIdRef.current) return;
      logger.debug('LessonSearchPicker query failed:', err);
      setResults([]);
      setHasQueried(true);
    } finally {
      if (myRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (selected) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected, runSearch]);

  if (selected) {
    return (
      <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg sticky top-0 z-10">
        <div>
          <span className="text-xs uppercase tracking-wide text-emerald-700 mr-2">Selected:</span>
          <span className="font-medium text-emerald-900">{selected.title}</span>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selected lesson"
          className="text-emerald-700 hover:text-emerald-900 p-1"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by lesson title"
          aria-label="Search lessons by title"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="lesson-picker-results"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {isLoading && (
          <Loader2
            size={18}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
          />
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">e.g., 'Three Sisters' or 'Apple Crisp'</p>

      {results.length > 0 && (
        <ul
          id="lesson-picker-results"
          role="listbox"
          aria-label="Lesson results"
          className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100"
        >
          {results.map((r) => (
            <li key={r.lesson_id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => onSelect(r)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 focus:bg-gray-100 focus:outline-none"
              >
                <div className="font-medium text-gray-900">{r.title}</div>
                {(!!r.grade_levels?.length || !!r.season_timing?.length) && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {r.grade_levels?.length ? `Grades ${r.grade_levels.join(', ')}` : ''}
                    {r.grade_levels?.length && r.season_timing?.length ? ' · ' : ''}
                    {r.season_timing?.join(', ')}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasQueried && results.length === 0 && !isLoading && (
        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
          No matches found.
        </div>
      )}

      {cantFindOption && onCantFind && hasQueried && (
        <div className="mt-2 text-sm text-gray-700">
          <button
            type="button"
            onClick={onCantFind}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            None of these is right — I'm updating but can't find it
          </button>
        </div>
      )}
    </div>
  );
}
