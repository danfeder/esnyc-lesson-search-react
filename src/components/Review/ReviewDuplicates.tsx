import { AlertTriangle, CheckCircle } from 'lucide-react';

interface Duplicate {
  lesson_id: string;
  combined_score: number | null;
  title_similarity: number | null;
  content_similarity: number | null;
  lesson: {
    title: string | null;
    grade_levels: string[] | null;
  };
}

interface ReviewDuplicatesProps {
  duplicates: Duplicate[];
  selectedDuplicate: string | null;
  onSelectDuplicate: (id: string) => void;
}

export function ReviewDuplicates({
  duplicates,
  selectedDuplicate,
  onSelectDuplicate,
}: ReviewDuplicatesProps) {
  if (duplicates.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="text-yellow-600" size={20} />
        <h2 className="text-lg font-semibold">Potential Duplicates</h2>
      </div>
      <div className="space-y-3">
        {duplicates.map((dup) => (
          <div
            key={dup.lesson_id}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedDuplicate === dup.lesson_id
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onSelectDuplicate(dup.lesson_id)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{dup.lesson.title || 'Untitled'}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Grades: {dup.lesson.grade_levels?.join(', ') || 'Not specified'}
                </p>
                <div className="mt-2 flex gap-4 text-sm">
                  <span>Overall: {Math.round((dup.combined_score ?? 0) * 100)}%</span>
                  <span>Title: {Math.round((dup.title_similarity ?? 0) * 100)}%</span>
                  <span>Content: {Math.round((dup.content_similarity ?? 0) * 100)}%</span>
                </div>
              </div>
              {selectedDuplicate === dup.lesson_id && (
                <CheckCircle className="text-green-600" size={20} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
