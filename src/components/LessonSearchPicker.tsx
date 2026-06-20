import { useState, useEffect, useRef, useCallback, useId, type KeyboardEvent } from 'react';
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
  // When true, soft-retired imports are excluded from the dropdown.
  // Submitter flows (RevisingSubmissionForm) opt in so teachers can't pick
  // a retired lesson as their UPDATE target. Reviewer flows (ReviewDetail
  // dup-review escape hatch) leave default false so the reviewer can still
  // find any lesson, including retired competitors.
  excludeRetired?: boolean;
}

const DEBOUNCE_MS = 300;
const MAX_RESULTS = 10;

export function LessonSearchPicker({
  selected,
  onSelect,
  onClear,
  cantFindOption = false,
  onCantFind,
  excludeRetired = false,
}: LessonSearchPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LessonSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);
  // -1 means no option is keyboard-active (aria-activedescendant unset).
  const [activeIndex, setActiveIndex] = useState(-1);
  // Collapsed by Escape; reset to false whenever a fresh query runs so the
  // list can reopen. Keeps Escape semantics component-local (no consumer prop).
  const [collapsed, setCollapsed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const listboxId = useId();
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  // Reset the keyboard cursor whenever the result set changes (new query /
  // new results) so a stale activeIndex never points past the list.
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  const isOpen = !collapsed && results.length > 0;

  const runSearch = useCallback(
    async (q: string) => {
      const myRequestId = ++requestIdRef.current;
      if (!q.trim()) {
        setResults([]);
        setHasQueried(false);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        let qry = supabase
          .from('lessons')
          .select('lesson_id, title, grade_levels, season_timing')
          .ilike('title', `%${q}%`);
        if (excludeRetired) {
          qry = qry.is('retired_at', null);
        }
        const { data, error } = await qry.order('title', { ascending: true }).limit(MAX_RESULTS);
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
    },
    [excludeRetired]
  );

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

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (!isOpen) return;
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      if (!isOpen) return;
      e.preventDefault();
      // Clamp at the top option (0); never below the list (no wrap).
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (isOpen && activeIndex >= 0 && activeIndex < results.length) {
        e.preventDefault();
        onSelect(results[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        // Component-local: collapse the list, keep focus in the input.
        setCollapsed(true);
        setActiveIndex(-1);
      }
    }
  };

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
          onChange={(e) => {
            setQuery(e.target.value);
            // A fresh keystroke reopens the list after an Escape collapse.
            setCollapsed(false);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search by lesson title"
          aria-label="Search lessons by title"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          // Only reference the listbox while it's actually in the DOM (it
          // renders under `isOpen`); a dangling IDREF when collapsed is an
          // ARIA violation.
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined}
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

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Lesson search results"
          className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100"
        >
          {results.map((r, index) => {
            const active = index === activeIndex;
            return (
              // Canonical listbox option: the option element itself is the
              // selection target (no nested interactive <button> inside
              // role="option"). Keyboard selection is managed by the combobox
              // input (Enter on the active option); the mouse path uses this
              // onClick. Focus stays in the input, per the combobox pattern.
              <li
                key={r.lesson_id}
                id={optionId(index)}
                role="option"
                aria-selected={active}
                onClick={() => onSelect(r)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`cursor-pointer px-3 py-2 hover:bg-gray-50 ${active ? 'bg-gray-100' : ''}`}
              >
                <div className="font-medium text-gray-900">{r.title}</div>
                {(!!r.grade_levels?.length || !!r.season_timing?.length) && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {r.grade_levels?.length ? `Grades ${r.grade_levels.join(', ')}` : ''}
                    {r.grade_levels?.length && r.season_timing?.length ? ' · ' : ''}
                    {r.season_timing?.join(', ')}
                  </div>
                )}
              </li>
            );
          })}
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
