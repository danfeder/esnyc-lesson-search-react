import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { School } from './SchoolSelector';
import { logger } from '@/utils/logger';

interface SchoolCheckboxGroupProps {
  selectedSchools: School[];

  onChange: (schools: School[]) => void;
  disabled?: boolean;
}

export function SchoolCheckboxGroup({
  selectedSchools,
  onChange,
  disabled = false,
}: SchoolCheckboxGroupProps) {
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

  if (loading) {
    return <div className="text-sm text-gray-500">Loading schools...</div>;
  }

  if (schools.length === 0) {
    return <div className="text-sm text-gray-500">No schools available</div>;
  }

  return (
    <div className="space-y-2">
      {schools.map((school) => {
        const isSelected = selectedSchools.some((s) => s.id === school.id);
        return (
          <label
            key={school.id}
            className={`flex items-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => !disabled && toggleSchool(school)}
              disabled={disabled}
              className="rounded text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-900">{school.name}</span>
          </label>
        );
      })}
    </div>
  );
}
