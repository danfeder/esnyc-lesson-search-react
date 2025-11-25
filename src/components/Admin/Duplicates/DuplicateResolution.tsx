import React from 'react';
import { EditableTitle } from '../../Admin';
import { ACTION_INFO, COLOR_CLASSES } from '../../../utils/duplicateConstants';
import type { DuplicateGroup } from '../../../types/admin';

interface DuplicateResolutionProps {
  group: DuplicateGroup;
  resolutionMode: 'single' | 'split' | 'keep_all';
  setResolutionMode: (mode: 'single' | 'split' | 'keep_all') => void;
  selectedCanonical: string | string[];
  setSelectedCanonical: (id: string | string[]) => void;
  splitSelections?: Record<string, string>;
  setSplitSelections?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  titleEdits: Record<string, string>;
  originalTitles: Record<string, string>;
  onTitleChange: (lessonId: string, newTitle: string) => void;
  onResolve: () => void;
  resolving: boolean;
  mergeMetadata: boolean;
  setMergeMetadata: (merge: boolean) => void;
}

export function DuplicateResolution({
  group,
  resolutionMode,
  setResolutionMode,
  selectedCanonical,
  setSelectedCanonical,
  splitSelections,
  setSplitSelections,
  titleEdits,
  originalTitles,
  onTitleChange,
  onResolve,
  resolving,
  mergeMetadata,
  setMergeMetadata,
}: DuplicateResolutionProps) {
  const actionInfo = ACTION_INFO[group.recommendedAction] || ACTION_INFO['manual_review'];
  const colorClasses = COLOR_CLASSES[actionInfo.color]?.split(' ') || [];

  return (
    <>
      {/* Recommended Action Info */}
      <div className={`${colorClasses[0]} ${colorClasses[1]} rounded-lg p-4 mb-6`}>
        <h3 className={`font-medium ${colorClasses[2]} mb-2`}>
          Recommended Action: {actionInfo.label}
        </h3>
        <p className={`${colorClasses[4]}`}>{actionInfo.description}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Resolution Options</h2>

        <div className="space-y-4">
          {/* Resolution Mode Selection */}
          <div className="space-y-3">
            <label className="flex items-start space-x-3">
              <input
                type="radio"
                checked={resolutionMode === 'single'}
                onChange={() => setResolutionMode('single')}
                className="mt-1"
              />
              <div>
                <p className="font-medium">Single Canonical Lesson</p>
                <p className="text-sm text-gray-600">
                  Choose one lesson as canonical and archive the rest
                </p>
              </div>
            </label>

            <label className="flex items-start space-x-3">
              <input
                type="radio"
                checked={resolutionMode === 'split'}
                onChange={() => setResolutionMode('split')}
                className="mt-1"
              />
              <div>
                <p className="font-medium">Split Into Sub-Groups</p>
                <p className="text-sm text-gray-600">
                  Keep multiple canonical lessons (useful if you identify distinct approaches)
                </p>
              </div>
            </label>

            {group.recommendedAction === 'keep_all' && (
              <label className="flex items-start space-x-3">
                <input
                  type="radio"
                  checked={resolutionMode === 'keep_all'}
                  onChange={() => setResolutionMode('keep_all')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">Keep All Lessons</p>
                  <p className="text-sm text-gray-600">
                    Preserve all versions as they have unique value
                  </p>
                </div>
              </label>
            )}
          </div>

          {/* Lesson Selection Based on Mode */}
          {resolutionMode === 'single' && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Select Canonical Lesson:</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {group.lessons.map((lesson) => (
                  <label
                    key={lesson.lessonId}
                    className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedCanonical === lesson.lessonId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="canonical"
                      value={lesson.lessonId}
                      checked={selectedCanonical === lesson.lessonId}
                      onChange={(e) => setSelectedCanonical(e.target.value)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium">
                        <EditableTitle
                          title={lesson.title}
                          lessonId={lesson.lessonId}
                          onTitleChange={onTitleChange}
                          isEdited={!!titleEdits[lesson.lessonId]}
                          originalTitle={originalTitles[lesson.lessonId]}
                        />
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <p>Score: {(lesson.canonicalScore || 0).toFixed(3)}</p>
                        <p>
                          Completeness: {((lesson.metadataCompleteness || 0) * 100).toFixed(0)}%
                        </p>
                        {lesson.gradelevels && lesson.gradelevels.length > 0 && (
                          <p>Grades: {lesson.gradelevels.join(', ')}</p>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {resolutionMode === 'split' && splitSelections && setSplitSelections && (
            <div className="mt-4 space-y-4">
              <h3 className="font-medium">Select Lessons to Keep as Canonical:</h3>
              {group.subGroups ? (
                // If subGroups are defined, use them
                group.subGroups.map((subGroup) => (
                  <div key={subGroup.groupName} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium mb-2">{subGroup.groupName}</h4>
                    <p className="text-sm text-gray-600 mb-3">{subGroup.rationale}</p>
                    <div className="space-y-2">
                      {group.lessons
                        .filter((l) => subGroup.lessonIds.includes(l.lessonId))
                        .map((lesson) => (
                          <label
                            key={lesson.lessonId}
                            className={`flex items-start p-2 border rounded cursor-pointer ${
                              splitSelections[subGroup.groupName] === lesson.lessonId
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`canonical-${subGroup.groupName}`}
                              value={lesson.lessonId}
                              checked={splitSelections[subGroup.groupName] === lesson.lessonId}
                              onChange={(e) =>
                                setSplitSelections((prev) => ({
                                  ...prev,
                                  [subGroup.groupName]: e.target.value,
                                }))
                              }
                              className="mt-1 mr-3"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium">
                                <EditableTitle
                                  title={lesson.title}
                                  lessonId={lesson.lessonId}
                                  onTitleChange={onTitleChange}
                                  isEdited={!!titleEdits[lesson.lessonId]}
                                  originalTitle={originalTitles[lesson.lessonId]}
                                  className="text-sm"
                                />
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                Score: {(lesson.canonicalScore || 0).toFixed(3)}
                              </p>
                            </div>
                          </label>
                        ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic">
                  No sub-groups defined for this duplicate group.
                </p>
              )}
            </div>
          )}

          {resolutionMode !== 'keep_all' && (
            <div className="mt-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={mergeMetadata}
                  onChange={(e) => setMergeMetadata(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Merge metadata from all lessons into canonical</span>
              </label>
            </div>
          )}

          {/* Action Button */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={onResolve}
              disabled={resolving || (resolutionMode === 'single' && !selectedCanonical)}
              className={`w-full flex items-center justify-center px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                resolving || (resolutionMode === 'single' && !selectedCanonical)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {resolving ? 'Processing...' : 'Confirm Resolution'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
