import React, { useState, useEffect } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { Check, ChevronDown, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SchoolBadge } from './SchoolBadge';
import { logger } from '@/utils/logger';

export interface School {
  id: string;
  name: string;
}

interface SchoolSelectorProps {
  selectedSchools: School[];

  onChange: (schools: School[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SchoolSelector({
  selectedSchools,
  onChange,
  placeholder = 'Select schools...',
  disabled = false,
}: SchoolSelectorProps) {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSchools() {
      try {
        const { data, error } = await supabase.from('schools').select('id, name').order('name');

        if (error) throw error;

        // Add validation
        if (!Array.isArray(data)) throw new Error('Invalid schools data');

        // Filter out any invalid entries
        const validSchools = data.filter(
          (school) =>
            school &&
            typeof school.id === 'string' &&
            typeof school.name === 'string' &&
            school.id.trim() !== '' &&
            school.name.trim() !== ''
        );

        setSchools(validSchools);
      } catch (error) {
        logger.error('Error fetching schools:', error);
        setSchools([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    }

    fetchSchools();
  }, []);

  const toggleSchool = (school: School) => {
    const isSelected = selectedSchools.some((s) => s.id === school.id);
    if (isSelected) {
      onChange(selectedSchools.filter((s) => s.id !== school.id));
    } else {
      onChange([...selectedSchools, school]);
    }
  };

  const removeSchool = (schoolId: string) => {
    onChange(selectedSchools.filter((s) => s.id !== schoolId));
  };

  return (
    <div className="space-y-2">
      <Listbox value={selectedSchools} onChange={() => {}} disabled={disabled}>
        <div className="relative">
          <Listbox.Button className="relative w-full cursor-default rounded-md bg-white py-2 pl-3 pr-10 text-left border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none">
            <span
              className={`block truncate ${selectedSchools.length === 0 ? 'text-gray-500' : 'text-gray-900'}`}
            >
              {selectedSchools.length === 0
                ? placeholder
                : `${selectedSchools.length} school${selectedSchools.length !== 1 ? 's' : ''} selected`}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </Listbox.Button>
          <Transition
            as={React.Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-gray-700 text-white py-1 text-base shadow-lg focus:outline-none">
              {loading ? (
                <div className="px-4 py-2 text-gray-300">Loading schools...</div>
              ) : schools.length === 0 ? (
                <div className="px-4 py-2 text-gray-300">No schools available</div>
              ) : (
                schools.map((school) => {
                  const isSelected = selectedSchools.some((s) => s.id === school.id);
                  return (
                    <Listbox.Option
                      key={school.id}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                          active ? 'bg-gray-600 text-white' : 'text-white'
                        }`
                      }
                      value={school}
                      onClick={() => toggleSchool(school)}
                    >
                      <span
                        className={`block truncate ${isSelected ? 'font-medium' : 'font-normal'}`}
                      >
                        {school.name}
                      </span>
                      {isSelected ? (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-white">
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </span>
                      ) : null}
                    </Listbox.Option>
                  );
                })
              )}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>

      {/* Display selected schools */}
      {selectedSchools.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedSchools.map((school) => (
            <div key={school.id} className="flex items-center">
              <SchoolBadge name={school.name} size="sm" />
              <button
                type="button"
                onClick={() => removeSchool(school.id)}
                className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-200 text-blue-600 hover:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
