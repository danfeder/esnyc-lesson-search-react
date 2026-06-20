import { Fragment } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X } from 'lucide-react';
import type { Lesson } from '@/types';
import { IntLessonDetail } from './IntLessonDetail';

interface IntLessonDrawerProps {
  lesson: Lesson | null;
  onClose: () => void;
}

export function IntLessonDrawer({ lesson, onClose }: IntLessonDrawerProps) {
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
              {lesson && (
                <>
                  <DialogTitle className="sr-only">{lesson.title}</DialogTitle>
                  <button
                    type="button"
                    className="int-drawer-close"
                    onClick={onClose}
                    aria-label="Close lesson details"
                  >
                    <X width={16} height={16} />
                  </button>
                  <IntLessonDetail lesson={lesson} />
                </>
              )}
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
