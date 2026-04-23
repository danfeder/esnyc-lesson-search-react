import { Fragment } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { ExternalLink, X } from 'lucide-react';
import type { Lesson } from '@/types';
import { FILTER_CONFIGS } from '@/utils/filterDefinitions';
import { intActivityLabel, intGradesLabel } from './IntListRow';

interface IntLessonDrawerProps {
  lesson: Lesson | null;
  onClose: () => void;
}

function culturalLabel(value: string): string {
  for (const region of FILTER_CONFIGS.culturalHeritage.options) {
    if (region.value === value) return region.label;
    for (const child of region.children ?? []) {
      if (child.value === value) return child.label;
    }
  }
  return value;
}

function academicSelected(ai: Lesson['metadata']['academicIntegration']): string[] {
  if (!ai) return [];
  if (Array.isArray(ai)) return ai;
  return ai.selected ?? [];
}

interface MetaRowProps {
  label: string;
  items: string[];

  format?: (value: string) => string;
}

function MetaRow({ label, items, format }: MetaRowProps) {
  if (!items || items.length === 0) return null;
  return (
    <div className="int-detail-meta-item">
      <dt>{label}</dt>
      <dd>
        {items.map((item) => (
          <span key={item} className="int-detail-tag">
            {format ? format(item) : item}
          </span>
        ))}
      </dd>
    </div>
  );
}

export function IntLessonDrawer({ lesson, onClose }: IntLessonDrawerProps) {
  const meta = lesson?.metadata;
  const activity = lesson ? intActivityLabel(lesson) : null;

  return (
    <Transition show={lesson !== null} as={Fragment}>
      <Dialog open={lesson !== null} onClose={onClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="transition-opacity duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="int-drawer-backdrop" aria-hidden="true" />
        </TransitionChild>

        <div className="fixed inset-0 z-[60] flex justify-end pointer-events-none">
          <TransitionChild
            as={Fragment}
            enter="transition-transform duration-200 ease-out"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transition-transform duration-150 ease-in"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <DialogPanel className="int-drawer pointer-events-auto">
              {lesson && meta && activity && (
                <>
                  <button
                    type="button"
                    className="int-drawer-close"
                    onClick={onClose}
                    aria-label="Close lesson details"
                  >
                    <X width={16} height={16} />
                  </button>
                  <div className="int-detail-eyebrow">
                    {activity.label} · Grades {intGradesLabel(lesson.gradeLevels)}
                  </div>
                  <h2 className="int-detail-title">{lesson.title}</h2>
                  <p className="int-detail-summary">{lesson.summary}</p>
                  {lesson.fileLink && (
                    <a
                      className="int-detail-cta"
                      href={lesson.fileLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Lesson Plan
                      <ExternalLink width={11} height={11} />
                    </a>
                  )}
                  <dl className="int-detail-meta-list">
                    <MetaRow label="Grades" items={lesson.gradeLevels} />
                    <MetaRow label="Location" items={meta.locationRequirements ?? []} />
                    <MetaRow label="Season" items={meta.seasonTiming ?? []} />
                    <MetaRow label="Themes" items={meta.thematicCategories ?? []} />
                    <MetaRow label="Competencies" items={meta.coreCompetencies} />
                    <MetaRow
                      label="Cultural"
                      items={meta.culturalHeritage}
                      format={culturalLabel}
                    />
                    <MetaRow label="Academic" items={academicSelected(meta.academicIntegration)} />
                    <MetaRow label="Garden Skills" items={meta.gardenSkills ?? []} />
                    <MetaRow label="Cooking Skills" items={meta.cookingSkills ?? []} />
                    <MetaRow label="Ingredients" items={meta.mainIngredients ?? []} />
                    <MetaRow label="Cooking Method" items={meta.cookingMethods ?? []} />
                    <MetaRow label="SEL" items={meta.socialEmotionalLearning ?? []} />
                    <MetaRow label="Observances" items={meta.observancesHolidays ?? []} />
                  </dl>
                </>
              )}
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
