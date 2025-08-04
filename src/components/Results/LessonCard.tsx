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
      className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group h-[280px] flex flex-col overflow-hidden relative"
      onClick={onClick}
    >
      {/* Header */}
      <div className="mb-3 flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors duration-200 line-clamp-1">
          {lesson.title}
        </h3>
      </div>

      {/* Summary */}
      <p className="text-gray-600 text-sm mb-3 leading-relaxed line-clamp-2 flex-shrink-0">
        {lesson.summary}
      </p>

      {/* Metadata */}
      <div className="flex items-center justify-between text-sm text-gray-500 mb-3 flex-shrink-0">
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

      {/* Spacer to push bottom content down */}
      <div className="flex-grow"></div>

      {/* Cooking Method for cooking lessons */}
      {lesson.metadata.cookingMethods && lesson.metadata.cookingMethods.length > 0 && (
        <div className="flex items-center gap-1 text-sm text-gray-600 mb-2 flex-shrink-0">
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

      {/* Tags - Limited display */}
      <div className="flex flex-wrap gap-2 mb-3 flex-shrink-0">
        {/* Season Tags - max 1 */}
        {lesson.metadata.seasonTiming?.slice(0, 1).map((season) => (
          <span key={season} className="lesson-tag lesson-tag-season">
            {season}
          </span>
        ))}

        {/* Theme Tags - max 1 */}
        {lesson.metadata.thematicCategories?.slice(0, 1).map((theme) => (
          <span key={theme} className="lesson-tag lesson-tag-theme">
            {theme}
          </span>
        ))}

        {/* Cultural Tags - max 1 */}
        {lesson.metadata.culturalHeritage?.slice(0, 1).map((culture) => (
          <span key={culture} className="lesson-tag lesson-tag-culture">
            {culture}
          </span>
        ))}

        {/* Show more indicator if we have more than 3 total tags */}
        {(() => {
          const totalTags =
            (lesson.metadata.seasonTiming?.length || 0) +
            (lesson.metadata.thematicCategories?.length || 0) +
            (lesson.metadata.culturalHeritage?.length || 0);
          const displayedTags =
            Math.min(1, lesson.metadata.seasonTiming?.length || 0) +
            Math.min(1, lesson.metadata.thematicCategories?.length || 0) +
            Math.min(1, lesson.metadata.culturalHeritage?.length || 0);
          const remainingTags = totalTags - displayedTags;

          return remainingTags > 0 ? (
            <span className="lesson-tag bg-gray-100 text-gray-600">+{remainingTags} more</span>
          ) : null;
        })()}
      </div>

      {/* View Lesson Plan Link - Positioned absolutely */}
      <a
        href={lesson.fileLink}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()} // Prevent card click when clicking button
        className="absolute bottom-6 right-6 inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors duration-200 group/link"
        aria-label={`View lesson plan for ${lesson.title}`}
      >
        <span className="underline-offset-2 group-hover/link:underline">View Plan</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
};
