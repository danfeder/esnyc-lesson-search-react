import type { RefObject } from 'react';
import Select from 'react-select';
import type { ReviewMetadata } from '@/types';
import { ALL_FIELD_CONFIGS } from '@/utils/filterDefinitions';
import { selectOptionsFromConfig } from '@/pages/reviewDetailHelpers';
import { culturalHeritageReviewOptions } from '@/utils/heritageHierarchy.generated';
import type { FieldProgress } from '@/pages/reviewValidation';
import { IntButton, IntFormField, IntPillGroup, IntProgressBar } from '@/components/Internal';

// Closed Cultural Heritage pick-list (Brief 4 — reviewer free-text ended 2026-07-03).
// The full-tier options (all 71 canonical values incl. internal, `value` = the stored
// Title-Case label, `label` = full ancestor chain) are GENERATED from the vocab, so
// every currently-stored value round-trips and the picker reads hierarchically. This
// is DELIBERATELY sourced from heritageHierarchy.generated (not the search filter's
// top+sub-only `culturalHeritageOptions`, which would drop the 40 internal-tier values
// lessons actually store). To add a value: edit the vocab + regenerate (ask maintainer).
const HERITAGE_OPTIONS = culturalHeritageReviewOptions;

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
  /**
   * Title-changed-on-resubmit hint: the Google Doc's CURRENT title when it
   * differs from the restored round-1 title in the field (computed by the
   * load hook). Renders a heads-up under the Title field; hides itself once
   * the field matches the doc's title (the reviewer adopted the new name).
   */
  docTitleHint?: string | null;
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
  docTitleHint,
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

  return (
    <div>
      <div className="adm-card">
        <div className="adm-section-eyebrow">What gets published</div>
        <p className="adm-section-desc">
          The title and summary that appear in the library. Prefilled from the doc — edit if needed.
        </p>
        <IntFormField label="Lesson title" required error={fieldError('Lesson title')}>
          <input
            type="text"
            className="adm-input"
            value={metadata.title ?? ''}
            onChange={(e) => handleMetadataChange('title', e.target.value)}
            placeholder="Lesson title"
          />
        </IntFormField>
        {/* Title-changed-on-resubmit heads-up. Amber inline note (same styling
            as TitleMismatchWarning). Hides itself once the field matches the
            doc's title — whether via the button or a manual retype. */}
        {docTitleHint &&
          metadata.title?.trim().toLowerCase() !== docTitleHint.trim().toLowerCase() && (
            <div className="mt-2 mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
              Heads up: the Google Doc&apos;s title changed since the last review round — it&apos;s
              now <strong>&ldquo;{docTitleHint}&rdquo;</strong>. The field above still holds the
              previous round&apos;s title; keep it or update it before publishing.
              <div style={{ marginTop: 8 }}>
                <IntButton size="sm" onClick={() => handleMetadataChange('title', docTitleHint)}>
                  Use the doc&apos;s new title
                </IntButton>
              </div>
            </div>
          )}
        <IntFormField label="Summary" hint="Optional. A short description shown with the lesson.">
          <textarea
            className="adm-textarea"
            rows={3}
            value={metadata.summary ?? ''}
            onChange={(e) => handleMetadataChange('summary', e.target.value)}
            placeholder="Short summary of the lesson…"
          />
        </IntFormField>
      </div>

      <div className="adm-card">
        <div className="adm-section-eyebrow">Metadata</div>
        <p className="adm-section-desc">Fix tags before publishing. Reviewer has the final call.</p>
        <IntProgressBar
          filled={fieldProgress.completed}
          total={fieldProgress.total}
          ariaLabel="Required fields"
        />

        {legacyDecisionWarning && (
          <div
            role="alert"
            aria-live="assertive"
            className="adm-hint adm-hint--error adm-alert--error"
          >
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
            label="Social-emotional skills"
            required
            error={fieldError('Social-Emotional Skills')}
          >
            <IntPillGroup
              options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.socialEmotionalLearning)}
              selected={metadata.socialEmotionalLearning ?? []}
              onChange={(next) => handleMetadataChange('socialEmotionalLearning', next)}
              ariaLabel="Social-emotional skills"
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
            {/* Non-creatable Select: culturalHeritage is a closed enum (Brief 4, */}
            {/* 2026-07-03) enforced by Zod client + edge. Was a CreatableSelect */}
            {/* (the last reviewer free-text field); CreatableSelect would invite */}
            {/* reviewer-typed values the save path now rejects. Options are the */}
            {/* full-tier generated list so every stored value round-trips. */}
            <Select
              inputId={inputIds.heritage}
              classNamePrefix="adm-rs"
              isMulti
              options={HERITAGE_OPTIONS}
              value={(metadata.culturalHeritage ?? []).map(
                (v) => HERITAGE_OPTIONS.find((o) => o.value === v) || { value: v, label: v }
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
