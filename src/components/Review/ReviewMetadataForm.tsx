import { useMemo } from 'react';
import CreatableSelect from 'react-select/creatable';
import { ALL_FIELD_CONFIGS, type FilterConfig } from '@/utils/filterDefinitions';
import type { ReviewMetadata } from '@/types';

interface ReviewMetadataFormProps {
  metadata: ReviewMetadata;
  onChange: <K extends keyof ReviewMetadata>(key: K, value: ReviewMetadata[K]) => void;
  validationErrors: string[];
  fieldProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
}

export function ReviewMetadataForm({
  metadata,
  onChange,
  validationErrors,
  fieldProgress,
}: ReviewMetadataFormProps) {
  // Helper functions for conditional field visibility
  const showCookingFields = useMemo(() => {
    return (
      metadata.activityType === 'cooking-only' ||
      metadata.activityType === 'both' ||
      metadata.activityType === 'cooking' // Legacy support
    );
  }, [metadata.activityType]);

  const showGardenFields = useMemo(() => {
    return (
      metadata.activityType === 'garden-only' ||
      metadata.activityType === 'both' ||
      metadata.activityType === 'garden' // Legacy support
    );
  }, [metadata.activityType]);

  const renderField = (key: string, config: FilterConfig) => {
    const value = metadata[key as keyof ReviewMetadata];
    const error = validationErrors.find((e) => e.includes(config.label));
    const isRequired = [
      'activityType',
      'location',
      'gradeLevels',
      'themes',
      'season',
      'coreCompetencies',
      'socialEmotionalLearning',
    ].includes(key);

    // Conditional requirements
    const isConditionallyRequired =
      (showCookingFields && ['cookingMethods', 'mainIngredients', 'cookingSkills'].includes(key)) ||
      (showGardenFields && ['gardenSkills'].includes(key));

    const showRequiredMark = isRequired || isConditionallyRequired;

    return (
      <div key={key} className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          {config.label} {showRequiredMark && <span className="text-red-500">*</span>}
        </label>
        {config.type === 'creatable' ? (
          <CreatableSelect
            isMulti
            options={config.options}
            value={Array.isArray(value) ? value.map((v: string) => ({ label: v, value: v })) : []}
            onChange={(newValue) => {
              onChange(key as keyof ReviewMetadata, newValue ? newValue.map((v) => v.value) : []);
            }}
            className={error ? 'border-red-300' : ''}
            aria-invalid={!!error}
          />
        ) : config.type === 'multiple' ? (
          <CreatableSelect
            isMulti
            options={config.options}
            value={
              Array.isArray(value)
                ? value.map(
                    (v: string) =>
                      config.options.find((o) => o.value === v) || { label: v, value: v }
                  )
                : []
            }
            onChange={(newValue) => {
              onChange(key as keyof ReviewMetadata, newValue ? newValue.map((v) => v.value) : []);
            }}
            className={error ? 'border-red-300' : ''}
            aria-invalid={!!error}
          />
        ) : (
          <select
            value={(value as string) || ''}
            onChange={(e) => onChange(key as keyof ReviewMetadata, e.target.value)}
            className={`w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
              error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
            }`}
            aria-invalid={!!error}
          >
            <option value="">Select...</option>
            {config.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Lesson Metadata</h2>
        <p className="text-sm text-gray-600 mt-1">Complete all required fields (*) to save</p>

        {/* Progress Indicator */}
        <div className="mt-3">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>
              Progress: {fieldProgress.completed}/{fieldProgress.total} fields
            </span>
            <span>{fieldProgress.percentage}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                fieldProgress.percentage === 100
                  ? 'bg-green-600'
                  : fieldProgress.percentage >= 75
                    ? 'bg-blue-600'
                    : fieldProgress.percentage >= 50
                      ? 'bg-yellow-600'
                      : 'bg-red-600'
              }`}
              style={{ width: `${fieldProgress.percentage}%` }}
              role="progressbar"
              aria-valuenow={fieldProgress.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      </div>

      {/* Validation Errors Summary */}
      {validationErrors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-sm font-medium text-red-800 mb-2">
            Please fix the following errors:
          </h3>
          <ul className="list-disc list-inside text-sm text-red-700">
            {validationErrors.map((error, idx) => (
              <li key={idx}>Missing required field: {error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-6">
        {/* Core Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderField('activityType', ALL_FIELD_CONFIGS.activityType)}
          {renderField('location', ALL_FIELD_CONFIGS.location)}
          {renderField('gradeLevels', ALL_FIELD_CONFIGS.gradeLevels)}
          {renderField('season', ALL_FIELD_CONFIGS.seasonTiming)}
        </div>

        {/* Thematic Categories */}
        <div>{renderField('themes', ALL_FIELD_CONFIGS.thematicCategories)}</div>

        {/* Competencies */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderField('coreCompetencies', ALL_FIELD_CONFIGS.coreCompetencies)}
          {renderField('socialEmotionalLearning', ALL_FIELD_CONFIGS.socialEmotionalLearning)}
        </div>

        {/* Cooking Specific Fields */}
        {showCookingFields && (
          <div className="border-t pt-6">
            <h3 className="font-medium text-gray-900 mb-4">Cooking Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderField('cookingMethods', ALL_FIELD_CONFIGS.cookingMethods)}
              {renderField('mainIngredients', ALL_FIELD_CONFIGS.mainIngredients)}
              {renderField('cookingSkills', ALL_FIELD_CONFIGS.cookingSkills)}
            </div>
          </div>
        )}

        {/* Garden Specific Fields */}
        {showGardenFields && (
          <div className="border-t pt-6">
            <h3 className="font-medium text-gray-900 mb-4">Garden Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderField('gardenSkills', ALL_FIELD_CONFIGS.gardenSkills)}
            </div>
          </div>
        )}

        {/* Additional Fields */}
        <div className="border-t pt-6">
          <h3 className="font-medium text-gray-900 mb-4">Additional Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderField('academicIntegration', ALL_FIELD_CONFIGS.academicIntegration)}
            {renderField('culturalHeritage', ALL_FIELD_CONFIGS.culturalHeritage)}
            {renderField('observancesHolidays', ALL_FIELD_CONFIGS.observancesHolidays)}
            {renderField(
              'culturalResponsivenessFeatures',
              ALL_FIELD_CONFIGS.culturalResponsivenessFeatures
            )}
            {renderField('lessonFormat', ALL_FIELD_CONFIGS.lessonFormat)}
          </div>
        </div>

        {/* Processing Notes */}
        <div className="border-t pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Processing Notes</label>
          <textarea
            value={metadata.processingNotes || ''}
            onChange={(e) => onChange('processingNotes', e.target.value)}
            rows={3}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Internal notes about how this lesson was processed..."
          />
        </div>
      </div>
    </div>
  );
}
