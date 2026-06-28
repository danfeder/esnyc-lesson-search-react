import type { RefObject } from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import type { ReviewMetadata } from '@/types';
import { ALL_FIELD_CONFIGS } from '@/utils/filterDefinitions';
import { selectOptionsFromConfig, flattenHeritageOptions } from '@/pages/reviewDetailHelpers';
import type { FieldProgress } from '@/pages/reviewValidation';
import { IntFormField, IntPillGroup, IntProgressBar } from '@/components/Internal';

/** Stable react-select input ids, declared in the page (uses `useId`). */
export interface ReviewMetadataInputIds {
  heritage: string;
  mainIngredients: string;
  cookingSkills: string;
  gardenSkills: string;
  observances: string;
  culturalResponsiveness: string;
}

interface ReviewMetadataFormProps {
  metadata: ReviewMetadata;
  onChange: <K extends keyof ReviewMetadata>(filterKey: K, value: ReviewMetadata[K]) => void;
  inputIds: ReviewMetadataInputIds;
  showCookingFields: boolean;
  showGardenFields: boolean;
  fieldProgress: FieldProgress;
  validationErrors: string[];
  errorBannerRef: RefObject<HTMLDivElement | null>;
  legacyDecisionWarning: string | null;
}

/**
 * LEFT column of the reviewer screen: the metadata form. Lifted verbatim from
 * ReviewDetail (Wave 5 PR-1b Task 1b.3) — markup/props/value-maps byte-identical.
 *
 * ⚠️ The 5 closed-enum react-selects (mainIngredients/cookingSkills/gardenSkills
 * + observancesHolidays/culturalResponsivenessFeatures) are NOT over-DRY'd: the
 * first three resolve their chip label via `ALL_FIELD_CONFIGS.<field>.options`
 * lookup while the last two use a raw `label: v`. These paths differ because the
 * closed-enum Zod/DB-CHECK contract (C02) + stored vocab differ per field;
 * collapsing them into a shared helper would silently change rendered labels and
 * risk the closed-enum contract (risk 7). Keep each `<Select>`'s value-map exactly.
 */
export function ReviewMetadataForm({
  metadata,
  onChange: handleMetadataChange,
  inputIds,
  showCookingFields,
  showGardenFields,
  fieldProgress,
  validationErrors,
  errorBannerRef,
  legacyDecisionWarning,
}: ReviewMetadataFormProps) {
  const fieldError = (label: string) =>
    validationErrors.includes(label) ? `Required.` : undefined;

  // Single-select pill adapter: mode='single' lets IntPillGroup talk in arrays
  // while we store a single value on metadata.
  const singleProps = (
    current: string | undefined,
    onChange: (next: string | undefined) => void
  ) => ({
    mode: 'single' as const,
    selected: current ? [current] : [],
    onChange: (next: string[]) => onChange(next[0]),
  });

  const heritageOptions = flattenHeritageOptions(ALL_FIELD_CONFIGS.culturalHeritage);

  return (
    <div>
      <div className="adm-card">
        <div className="adm-section-eyebrow">Metadata</div>
        <p className="adm-section-desc">Fix tags before publishing. Reviewer has the final call.</p>
        <IntProgressBar
          filled={fieldProgress.completed}
          total={fieldProgress.total}
          ariaLabel="Required fields"
        />

        {legacyDecisionWarning && (
          <div role="status" className="adm-hint adm-hint--error adm-alert--error">
            {legacyDecisionWarning}
          </div>
        )}

        {validationErrors.length > 0 && (
          <div
            ref={errorBannerRef}
            tabIndex={-1}
            role="alert"
            className="adm-hint adm-hint--error adm-alert--error"
          >
            Missing required fields: {validationErrors.join(', ')}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <IntFormField label="Activity type" required error={fieldError('Activity Type')}>
            <IntPillGroup
              options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.activityType)}
              selected={metadata.activityType ?? []}
              onChange={(v) => handleMetadataChange('activityType', v)}
              ariaLabel="Activity type"
            />
          </IntFormField>

          <IntFormField label="Location" required error={fieldError('Location')}>
            <IntPillGroup
              options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.location)}
              {...singleProps(metadata.location, (v) => handleMetadataChange('location', v))}
              ariaLabel="Location"
            />
          </IntFormField>

          <IntFormField label="Grades" required error={fieldError('Grade Levels')}>
            <IntPillGroup
              variant="green"
              options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.gradeLevels)}
              selected={metadata.gradeLevels ?? []}
              onChange={(next) => handleMetadataChange('gradeLevels', next)}
              ariaLabel="Grades"
            />
          </IntFormField>

          <IntFormField label="Seasons" required error={fieldError('Season & Timing')}>
            <IntPillGroup
              variant="green"
              options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.seasonTiming)}
              selected={metadata.season ?? []}
              onChange={(next) => handleMetadataChange('season', next)}
              ariaLabel="Seasons"
            />
          </IntFormField>

          <IntFormField label="Thematic" required error={fieldError('Thematic Categories')}>
            <IntPillGroup
              variant="green"
              options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.thematicCategories)}
              selected={metadata.themes ?? []}
              onChange={(next) => handleMetadataChange('themes', next)}
              ariaLabel="Thematic categories"
            />
          </IntFormField>

          <IntFormField label="Competencies" required error={fieldError('Core Competencies')}>
            <IntPillGroup
              options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.coreCompetencies)}
              selected={metadata.coreCompetencies ?? []}
              onChange={(next) => handleMetadataChange('coreCompetencies', next)}
              ariaLabel="Core competencies"
            />
          </IntFormField>

          <IntFormField
            label="Social-emotional learning"
            required
            error={fieldError('Social-Emotional Learning')}
          >
            <IntPillGroup
              options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.socialEmotionalLearning)}
              selected={metadata.socialEmotionalLearning ?? []}
              onChange={(next) => handleMetadataChange('socialEmotionalLearning', next)}
              ariaLabel="Social-emotional learning"
            />
          </IntFormField>

          <IntFormField label="Academic">
            <IntPillGroup
              options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.academicIntegration)}
              selected={metadata.academicIntegration ?? []}
              onChange={(next) => handleMetadataChange('academicIntegration', next)}
              ariaLabel="Academic integration"
            />
          </IntFormField>

          <div className="adm-field">
            <label className="adm-label" htmlFor={inputIds.heritage}>
              Cultural heritage
            </label>
            <CreatableSelect
              inputId={inputIds.heritage}
              classNamePrefix="adm-rs"
              isMulti
              options={heritageOptions}
              value={(metadata.culturalHeritage ?? []).map(
                (v) => heritageOptions.find((o) => o.value === v) || { value: v, label: v }
              )}
              onChange={(next) =>
                handleMetadataChange('culturalHeritage', next ? next.map((o) => o.value) : [])
              }
            />
          </div>
        </div>

        {showCookingFields && (
          <div style={{ marginTop: 8 }}>
            <div className="adm-section-eyebrow" style={{ marginBottom: 8 }}>
              Cooking details
            </div>

            <IntFormField label="Cooking methods" required error={fieldError('Cooking Methods')}>
              <IntPillGroup
                options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.cookingMethods)}
                selected={metadata.cookingMethods ?? []}
                onChange={(next) => handleMetadataChange('cookingMethods', next)}
                ariaLabel="Cooking methods"
              />
            </IntFormField>

            <div className="adm-field">
              <label className="adm-label adm-label-req" htmlFor={inputIds.mainIngredients}>
                Main ingredients
              </label>
              {/* Non-creatable Select: mainIngredients is a closed C02 */}
              {/* canonical enum enforced by Zod + DB CHECK in C02. */}
              {/* CreatableSelect would invite reviewer-typed values */}
              {/* that the save path rejects. */}
              <Select
                inputId={inputIds.mainIngredients}
                classNamePrefix="adm-rs"
                isMulti
                options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.mainIngredients)}
                value={(metadata.mainIngredients ?? []).map((v) => ({
                  value: v,
                  label:
                    ALL_FIELD_CONFIGS.mainIngredients.options.find((o) => o.value === v)?.label ||
                    v,
                }))}
                onChange={(next) =>
                  handleMetadataChange('mainIngredients', next ? next.map((o) => o.value) : [])
                }
              />
              {fieldError('Main Ingredients') && (
                <p className="adm-hint adm-hint--error">Required.</p>
              )}
            </div>

            <div className="adm-field">
              <label className="adm-label adm-label-req" htmlFor={inputIds.cookingSkills}>
                Cooking skills
              </label>
              {/* Non-creatable Select: cookingSkills is a closed C02 */}
              {/* canonical enum enforced by Zod + DB CHECK in C02. */}
              {/* CreatableSelect would invite reviewer-typed values */}
              {/* that the save path rejects. */}
              <Select
                inputId={inputIds.cookingSkills}
                classNamePrefix="adm-rs"
                isMulti
                options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.cookingSkills)}
                value={(metadata.cookingSkills ?? []).map((v) => ({
                  value: v,
                  label:
                    ALL_FIELD_CONFIGS.cookingSkills.options.find((o) => o.value === v)?.label || v,
                }))}
                onChange={(next) =>
                  handleMetadataChange('cookingSkills', next ? next.map((o) => o.value) : [])
                }
              />
              {fieldError('Cooking Skills') && (
                <p className="adm-hint adm-hint--error">Required.</p>
              )}
            </div>
          </div>
        )}

        {showGardenFields && (
          <div style={{ marginTop: 8 }}>
            <div className="adm-section-eyebrow" style={{ marginBottom: 8 }}>
              Garden details
            </div>
            <div className="adm-field">
              <label className="adm-label adm-label-req" htmlFor={inputIds.gardenSkills}>
                Garden skills
              </label>
              {/* Non-creatable Select: gardenSkills is a closed enum (24 */}
              {/* canonical values) enforced by Zod + SQL CHECK in PR 6e. */}
              {/* CreatableSelect would invite reviewer-typed values that */}
              {/* the save path rejects. */}
              <Select
                inputId={inputIds.gardenSkills}
                classNamePrefix="adm-rs"
                isMulti
                options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.gardenSkills)}
                value={(metadata.gardenSkills ?? []).map((v) => ({
                  value: v,
                  label:
                    ALL_FIELD_CONFIGS.gardenSkills.options.find((o) => o.value === v)?.label || v,
                }))}
                onChange={(next) =>
                  handleMetadataChange('gardenSkills', next ? next.map((o) => o.value) : [])
                }
              />
              {fieldError('Garden Skills') && <p className="adm-hint adm-hint--error">Required.</p>}
            </div>
          </div>
        )}

        <div style={{ marginTop: 8 }}>
          <div className="adm-section-eyebrow" style={{ marginBottom: 8 }}>
            Additional
          </div>

          <div className="adm-field">
            <label className="adm-label" htmlFor={inputIds.observances}>
              Observances &amp; holidays
            </label>
            {/* Non-creatable Select: observancesHolidays is a closed enum */}
            {/* (16 canonical values) enforced by Zod + SQL CHECK in PR 6e. */}
            {/* CreatableSelect would invite reviewer-typed values that */}
            {/* the save path rejects. */}
            <Select
              inputId={inputIds.observances}
              classNamePrefix="adm-rs"
              isMulti
              options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.observancesHolidays)}
              value={(metadata.observancesHolidays ?? []).map((v) => ({
                value: v,
                label: v,
              }))}
              onChange={(next) =>
                handleMetadataChange('observancesHolidays', next ? next.map((o) => o.value) : [])
              }
            />
          </div>

          <div className="adm-field">
            <label className="adm-label" htmlFor={inputIds.culturalResponsiveness}>
              Cultural responsiveness features
            </label>
            {/* Non-creatable Select: CRF is a closed enum (7 Brown CR */}
            {/* master-list features) enforced by Zod + SQL CHECK in PR 1. */}
            {/* CreatableSelect would invite reviewer-typed values that */}
            {/* the save path silently rejects. */}
            <Select
              inputId={inputIds.culturalResponsiveness}
              classNamePrefix="adm-rs"
              isMulti
              options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.culturalResponsivenessFeatures)}
              value={(metadata.culturalResponsivenessFeatures ?? []).map((v) => ({
                value: v,
                label: v,
              }))}
              onChange={(next) =>
                handleMetadataChange(
                  'culturalResponsivenessFeatures',
                  next ? next.map((o) => o.value) : []
                )
              }
            />
          </div>

          <IntFormField label="Processing notes" hint="Internal — not shown to teacher.">
            <textarea
              className="adm-textarea"
              rows={3}
              value={metadata.processingNotes || ''}
              onChange={(e) => handleMetadataChange('processingNotes', e.target.value)}
              placeholder="Internal notes about how this lesson was processed…"
            />
          </IntFormField>
        </div>
      </div>
    </div>
  );
}
