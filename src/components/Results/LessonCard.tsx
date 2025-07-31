import React from 'react';
import { ExternalLink, Clock, Users, MapPin, ChefHat, Sprout, Flame } from 'lucide-react';
import { Lesson } from '../../types';

interface LessonCardProps {
  lesson: Lesson;
  onClick: () => void;
}

export const LessonCard: React.FC<LessonCardProps> = ({ lesson, onClick }) => {
  const getActivityIcon = (hasCooking: boolean, hasGarden: boolean) => {
    if (hasCooking && hasGarden) {
      return (
        <div className="flex space-x-1">
          <ChefHat className="w-3 h-3" />
          <Sprout className="w-3 h-3" />
        </div>
      );
    } else if (hasCooking && !hasGarden) {
      return <ChefHat className="w-4 h-4" />;
    } else if (!hasCooking && hasGarden) {
      return <Sprout className="w-4 h-4" />;
    } else {
      return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div
      className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
      onClick={onClick}
    >
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors duration-200 line-clamp-2">
          {lesson.title}
        </h3>
      </div>

      {/* Summary */}
      <p className="text-gray-600 text-sm mb-4 leading-relaxed">{lesson.summary}</p>

      {/* Metadata */}
      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <div className="flex items-center space-x-4">
          {/* Grade Levels */}
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span>
              {lesson.gradeLevels.slice(0, 3).join(', ')}
              {lesson.gradeLevels.length > 3 ? '...' : ''}
            </span>
          </div>

          {/* Location */}
          {lesson.metadata.locationRequirements &&
            lesson.metadata.locationRequirements.length > 0 && (
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{lesson.metadata.locationRequirements.join(', ')}</span>
              </div>
            )}

          {/* Activity Type */}
          <div className="flex items-center space-x-1">
            {(() => {
              const hasCooking = (lesson.metadata.cookingSkills?.length ?? 0) > 0;
              const hasGarden = (lesson.metadata.gardenSkills?.length ?? 0) > 0;
              let label = 'Academic Only';

              if (hasCooking && hasGarden) {
                label = 'Cooking + Garden';
              } else if (hasCooking && !hasGarden) {
                label = 'Cooking Only';
              } else if (!hasCooking && hasGarden) {
                label = 'Garden Only';
              }

              return (
                <>
                  {getActivityIcon(hasCooking, hasGarden)}
                  <span className="capitalize">{label}</span>
                </>
              );
            })()}
          </div>
        </div>

        {/* External Link Indicator */}
        <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>

      {/* Cooking Method for cooking lessons */}
      {lesson.metadata.cookingMethods && lesson.metadata.cookingMethods.length > 0 && (
        <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
          {lesson.metadata.cookingMethods.includes('No-cook') ? (
            <>
              <div className="w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-green-700 font-medium">No-cook</span>
            </>
          ) : (
            <>
              <Flame className="w-3.5 h-3.5" />
              <span>{lesson.metadata.cookingMethods.join(', ')}</span>
            </>
          )}
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Season Tags */}
        {lesson.metadata.seasonTiming?.slice(0, 2).map((season) => (
          <span key={season} className="lesson-tag lesson-tag-season">
            {season}
          </span>
        ))}

        {/* Theme Tags */}
        {lesson.metadata.thematicCategories?.slice(0, 1).map((theme) => (
          <span key={theme} className="lesson-tag lesson-tag-theme">
            {theme}
          </span>
        ))}

        {/* Cultural Tags */}
        {lesson.metadata.culturalHeritage?.slice(0, 1).map((culture) => (
          <span key={culture} className="lesson-tag lesson-tag-culture">
            {culture}
          </span>
        ))}

        {/* Show more indicator */}
        {(lesson.metadata.seasonTiming?.length || 0) +
          (lesson.metadata.thematicCategories?.length || 0) +
          (lesson.metadata.culturalHeritage?.length || 0) >
          4 && (
          <span className="lesson-tag bg-gray-100 text-gray-600">
            +
            {(lesson.metadata.seasonTiming?.length || 0) +
              (lesson.metadata.thematicCategories?.length || 0) +
              (lesson.metadata.culturalHeritage?.length || 0) -
              4}{' '}
            more
          </span>
        )}
      </div>

      {/* View Lesson Plan Button */}
      <div className="flex justify-end">
        <a
          href={lesson.fileLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()} // Prevent card click when clicking button
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors duration-200"
        >
          <ExternalLink className="w-4 h-4" />
          View Lesson Plan
        </a>
      </div>
    </div>
  );
};
