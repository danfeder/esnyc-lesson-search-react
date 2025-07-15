import React from 'react';
import { X, ExternalLink, Clock, Users, MapPin, ChefHat, Sprout, Star } from 'lucide-react';
import { Lesson } from '../../types';

interface LessonModalProps {
  lesson: Lesson | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LessonModal: React.FC<LessonModalProps> = ({ lesson, isOpen, onClose }) => {
  if (!isOpen || !lesson) return null;

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return { label: 'High Confidence', className: 'bg-green-100 text-green-800 border-green-200' };
    } else if (confidence >= 0.6) {
      return { label: 'Medium Confidence', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    } else {
      return { label: 'Low Confidence', className: 'bg-red-100 text-red-800 border-red-200' };
    }
  };

  const getActivityIcon = (hasCooking: boolean, hasGarden: boolean) => {
    if (hasCooking && hasGarden) {
      return { 
        icon: (
          <div className="flex space-x-1">
            <ChefHat className="w-4 h-4" />
            <Sprout className="w-4 h-4" />
          </div>
        ), 
        label: 'Cooking + Garden' 
      };
    } else if (hasCooking && !hasGarden) {
      return { icon: <ChefHat className="w-5 h-5" />, label: 'Cooking Only' };
    } else if (!hasCooking && hasGarden) {
      return { icon: <Sprout className="w-5 h-5" />, label: 'Garden Only' };
    } else {
      return { icon: <Clock className="w-5 h-5" />, label: 'Academic Only' };
    }
  };

  const confidence = getConfidenceBadge(lesson.confidence.overall);
  const hasCooking = (lesson.metadata.cookingSkills?.length ?? 0) > 0;
  const hasGarden = (lesson.metadata.gardenSkills?.length ?? 0) > 0;
  const activity = getActivityIcon(hasCooking, hasGarden);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors duration-200"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="pr-12">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-2xl font-bold leading-tight">{lesson.title}</h1>
            </div>
            
            <div className="flex items-center space-x-4 text-primary-100">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Grades {lesson.gradeLevels.join(', ')}</span>
              </div>
              
              {lesson.metadata.locationRequirements && lesson.metadata.locationRequirements.length > 0 && (
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>{lesson.metadata.locationRequirements.join(', ')}</span>
                </div>
              )}
              
              {activity && (
                <div className="flex items-center space-x-2">
                  {activity.icon}
                  <span>{activity.label}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Summary & Confidence */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Lesson Summary</h2>
              <div className={`px-3 py-1 rounded-full text-sm font-medium border ${confidence.className}`}>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4" />
                  <span>{confidence.label}</span>
                </div>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed">{lesson.summary}</p>
          </div>

          {/* Lesson Plan Link */}
          {lesson.fileLink && (
            <div className="mb-8 p-4 bg-accent-50 border border-accent-200 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-2">Access Full Lesson Plan</h3>
              <a
                href={lesson.fileLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-accent-500 hover:bg-accent-600 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 hover:shadow-md"
              >
                <span>View Complete Lesson</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Thematic Categories */}
            {lesson.metadata.thematicCategories && lesson.metadata.thematicCategories.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Thematic Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {lesson.metadata.thematicCategories.map((theme) => (
                    <span key={theme} className="lesson-tag lesson-tag-theme">
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Seasons */}
            {lesson.metadata.seasonTiming && lesson.metadata.seasonTiming.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Seasons & Timing</h3>
                <div className="flex flex-wrap gap-2">
                  {lesson.metadata.seasonTiming.map((season) => (
                    <span key={season} className="lesson-tag lesson-tag-season">
                      {season}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Core Competencies */}
            {lesson.metadata.coreCompetencies && lesson.metadata.coreCompetencies.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Core Competencies</h3>
                <div className="flex flex-wrap gap-2">
                  {lesson.metadata.coreCompetencies.map((competency) => (
                    <span key={competency} className="lesson-tag bg-purple-100 text-purple-800">
                      {competency}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Cultural Heritage */}
            {lesson.metadata.culturalHeritage && lesson.metadata.culturalHeritage.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Cultural Heritage</h3>
                <div className="flex flex-wrap gap-2">
                  {lesson.metadata.culturalHeritage.map((culture) => (
                    <span key={culture} className="lesson-tag lesson-tag-culture">
                      {culture}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ingredients */}
            {lesson.metadata.mainIngredients && lesson.metadata.mainIngredients.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Key Ingredients</h3>
                <div className="flex flex-wrap gap-2">
                  {lesson.metadata.mainIngredients.slice(0, 10).map((ingredient) => (
                    <span key={ingredient} className="lesson-tag bg-green-100 text-green-800">
                      {ingredient}
                    </span>
                  ))}
                  {lesson.metadata.mainIngredients.length > 10 && (
                    <span className="lesson-tag bg-gray-100 text-gray-600">
                      +{lesson.metadata.mainIngredients.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Skills */}
            {lesson.metadata.skills && lesson.metadata.skills.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Skills Developed</h3>
                <div className="flex flex-wrap gap-2">
                  {lesson.metadata.skills.slice(0, 8).map((skill) => (
                    <span key={skill} className="lesson-tag bg-blue-100 text-blue-800">
                      {skill}
                    </span>
                  ))}
                  {lesson.metadata.skills.length > 8 && (
                    <span className="lesson-tag bg-gray-100 text-gray-600">
                      +{lesson.metadata.skills.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Confidence Breakdown */}
          <div className="mt-8 p-4 bg-gray-50 rounded-xl">
            <h3 className="font-semibold text-gray-900 mb-3">Data Confidence Scores</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Overall:</span>
                <span className="ml-2 font-medium">{Math.round(lesson.confidence.overall * 100)}%</span>
              </div>
              <div>
                <span className="text-gray-600">Title:</span>
                <span className="ml-2 font-medium">{Math.round(lesson.confidence.title * 100)}%</span>
              </div>
              <div>
                <span className="text-gray-600">Summary:</span>
                <span className="ml-2 font-medium">{Math.round(lesson.confidence.summary * 100)}%</span>
              </div>
              <div>
                <span className="text-gray-600">Categories:</span>
                <span className="ml-2 font-medium">{Math.round(lesson.confidence.overall * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};