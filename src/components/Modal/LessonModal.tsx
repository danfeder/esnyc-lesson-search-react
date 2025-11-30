import React from 'react';
import { X, ExternalLink, Clock, Users, MapPin, ChefHat, Sprout } from 'lucide-react';
import { Lesson } from '@/types';

interface LessonModalProps {
  lesson: Lesson | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LessonModal: React.FC<LessonModalProps> = ({ lesson, isOpen, onClose }) => {
  if (!isOpen || !lesson) return null;

  const getActivityIcon = (hasCooking: boolean, hasGarden: boolean) => {
    if (hasCooking && hasGarden) {
      return {
        icon: (
          <div className="flex space-x-1">
            <ChefHat className="w-4 h-4" />
            <Sprout className="w-4 h-4" />
          </div>
        ),
        label: 'Cooking + Garden',
      };
    } else if (hasCooking && !hasGarden) {
      return { icon: <ChefHat className="w-5 h-5" />, label: 'Cooking Only' };
    } else if (!hasCooking && hasGarden) {
      return { icon: <Sprout className="w-5 h-5" />, label: 'Garden Only' };
    } else {
      return { icon: <Clock className="w-5 h-5" />, label: 'Academic Only' };
    }
  };

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

              {lesson.metadata.locationRequirements &&
                lesson.metadata.locationRequirements.length > 0 && (
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
          {/* Summary */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lesson Summary</h2>
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

          {/* Last Modified Date */}
          {lesson.last_modified && (
            <div className="mb-6 text-sm text-gray-600">
              <span className="font-medium">Last Modified:</span>{' '}
              {new Date(lesson.last_modified).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Thematic Categories */}
            {lesson.metadata.thematicCategories &&
              lesson.metadata.thematicCategories.length > 0 && (
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

            {/* Observances & Holidays */}
            {lesson.metadata.observancesHolidays &&
              lesson.metadata.observancesHolidays.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Observances & Holidays</h3>
                  <div className="flex flex-wrap gap-2">
                    {lesson.metadata.observancesHolidays.map((holiday) => (
                      <span key={holiday} className="lesson-tag bg-amber-100 text-amber-800">
                        {holiday}
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

            {/* Academic Integration */}
            {lesson.metadata.academicIntegration &&
              (() => {
                // Handle both array format and object with selected key
                const ai = lesson.metadata.academicIntegration;
                const subjects: string[] = Array.isArray(ai)
                  ? ai.filter((item): item is string => typeof item === 'string')
                  : ai && typeof ai === 'object' && 'selected' in ai && Array.isArray(ai.selected)
                    ? ai.selected.filter((item): item is string => typeof item === 'string')
                    : [];

                return subjects.length > 0 ? (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Academic Integration</h3>
                    <div className="flex flex-wrap gap-2">
                      {subjects.map((subject) => (
                        <span key={subject} className="lesson-tag bg-indigo-100 text-indigo-800">
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

            {/* Social-Emotional Learning */}
            {lesson.metadata.socialEmotionalLearning &&
              lesson.metadata.socialEmotionalLearning.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Social-Emotional Learning</h3>
                  <div className="flex flex-wrap gap-2">
                    {lesson.metadata.socialEmotionalLearning.map((sel) => (
                      <span key={sel} className="lesson-tag bg-pink-100 text-pink-800">
                        {sel}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Cultural Responsiveness Features */}
            {lesson.metadata.culturalResponsivenessFeatures &&
              lesson.metadata.culturalResponsivenessFeatures.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Cultural Responsiveness Features
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {lesson.metadata.culturalResponsivenessFeatures.map((feature) => (
                      <span key={feature} className="lesson-tag bg-teal-100 text-teal-800">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Lesson Format */}
            {lesson.metadata.lessonFormat && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Lesson Format</h3>
                <p className="text-gray-700">{lesson.metadata.lessonFormat}</p>
              </div>
            )}

            {/* Cooking Skills (detailed) */}
            {lesson.metadata.cookingSkills && lesson.metadata.cookingSkills.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Cooking Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {lesson.metadata.cookingSkills.map((skill) => (
                    <span key={skill} className="lesson-tag bg-orange-100 text-orange-800">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Cooking Methods */}
            {lesson.metadata.cookingMethods && lesson.metadata.cookingMethods.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Cooking Methods</h3>
                <div className="flex flex-wrap gap-2">
                  {lesson.metadata.cookingMethods.map((method) => (
                    <span key={method} className="lesson-tag bg-red-100 text-red-800">
                      {method}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Garden Skills (detailed) */}
            {lesson.metadata.gardenSkills && lesson.metadata.gardenSkills.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Garden Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {lesson.metadata.gardenSkills.map((skill) => (
                    <span key={skill} className="lesson-tag bg-green-100 text-green-800">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Processing Notes */}
          {lesson.processing_notes && (
            <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-2">Processing Notes</h3>
              <p className="text-gray-700 italic">{lesson.processing_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
