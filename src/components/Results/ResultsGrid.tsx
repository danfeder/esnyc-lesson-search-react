import React from 'react';
import { Lesson } from '../../types';
import { LessonCard } from './LessonCard';

interface ResultsGridProps {
  lessons: Lesson[];
  // eslint-disable-next-line no-unused-vars
  onLessonClick: (lesson: Lesson) => void;
  isLoading?: boolean;
}

export const ResultsGrid: React.FC<ResultsGridProps> = ({
  lessons,
  onLessonClick,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="card p-6 animate-pulse">
            <div className="flex justify-between items-start mb-4">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-6 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
            <div className="flex space-x-4 mb-4">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="flex space-x-2">
              <div className="h-6 bg-gray-200 rounded w-16"></div>
              <div className="h-6 bg-gray-200 rounded w-20"></div>
              <div className="h-6 bg-gray-200 rounded w-14"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (lessons.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <span className="text-4xl">🔍</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No lessons found</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Try adjusting your search terms or filters to find more lessons.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {lessons.map((lesson) => (
        <LessonCard key={lesson.lessonId} lesson={lesson} onClick={() => onLessonClick(lesson)} />
      ))}
    </div>
  );
};
