import { EditableTitle } from '../../Admin';
import type { DuplicateGroup } from '../../../types/admin';

interface DuplicateLessonListProps {
  group: DuplicateGroup;
  lessonDetails: Record<string, any>;
  titleEdits: Record<string, string>;
  originalTitles: Record<string, string>;
  onTitleChange: (lessonId: string, newTitle: string) => void;
}

export function DuplicateLessonList({
  group,
  lessonDetails,
  titleEdits,
  originalTitles,
  onTitleChange,
}: DuplicateLessonListProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">All Lessons in Group</h2>
      <div className="space-y-3">
        {group.lessons.map((lesson) => {
          const fullLesson = lessonDetails[lesson.lessonId];
          return (
            <div
              key={lesson.lessonId}
              className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  <EditableTitle
                    title={lesson.title}
                    lessonId={lesson.lessonId}
                    onTitleChange={onTitleChange}
                    isEdited={!!titleEdits[lesson.lessonId]}
                    originalTitle={originalTitles[lesson.lessonId]}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">ID: {lesson.lessonId}</p>
                <div className="text-sm text-gray-600 mt-1">
                  {lesson.gradelevels && lesson.gradelevels.length > 0 && (
                    <span>Grades: {lesson.gradelevels.join(', ')} • </span>
                  )}
                  <span>Score: {(lesson.canonicalScore || 0).toFixed(3)} • </span>
                  <span>
                    Completeness: {((lesson.metadataCompleteness || 0) * 100).toFixed(0)}%
                  </span>
                </div>
                {lesson.lastModified && (
                  <p className="text-xs text-gray-500 mt-1">
                    Modified: {new Date(lesson.lastModified).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="ml-4 flex flex-col gap-2">
                {fullLesson?.file_link ? (
                  <a
                    href={fullLesson.file_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    View in Google Docs →
                  </a>
                ) : (
                  <span className="px-3 py-1 text-sm bg-gray-300 text-gray-600 rounded">
                    No link available
                  </span>
                )}
                {lesson.contentHash && (
                  <span className="text-xs text-gray-400" title={`Hash: ${lesson.contentHash}`}>
                    Hash: {lesson.contentHash.substring(0, 8)}...
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
