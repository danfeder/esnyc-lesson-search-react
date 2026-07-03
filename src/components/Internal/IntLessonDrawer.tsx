import { Fragment } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X } from 'lucide-react';
import type { Lesson } from '@/types';
import { IntLessonPaneBody, type LessonPaneStatus } from './IntLessonPaneBody';

interface IntLessonDrawerProps {
  open: boolean;
  status: LessonPaneStatus;
  lesson: Lesson | null;
  onClose: () => void;
  onRetry?: () => void;
}

const STATUS_TITLES: Record<Exclude<LessonPaneStatus, 'ready'>, string> = {
  loading: 'Loading lesson',
  'not-found': 'Lesson not found',
  error: "Couldn't load this lesson",
};

export function IntLessonDrawer({ open, status, lesson, onClose, onRetry }: IntLessonDrawerProps) {
  // D2 §2d: the dialog has an accessible name in EVERY open status (not just
  // ready) — a deep link lands in loading/not-found before any lesson exists.
  const title = status === 'ready' ? (lesson?.title ?? 'Lesson details') : STATUS_TITLES[status];

  return (
    <Transition show={open} as={Fragment}>
      <Dialog open={open} onClose={onClose} className="relative z-50">
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
              <DialogTitle className="sr-only">{title}</DialogTitle>
              <button
                type="button"
                className="int-drawer-close"
                onClick={onClose}
                aria-label="Close lesson details"
              >
                <X width={16} height={16} />
              </button>
              <IntLessonPaneBody
                status={status}
                lesson={lesson}
                onClose={onClose}
                onRetry={onRetry}
              />
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
