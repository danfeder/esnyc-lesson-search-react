import { Fragment } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { X } from 'lucide-react';
import type { FacetCounts } from '@/utils/facetCounts';
import { IntSidebar } from './IntSidebar';

interface IntMobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pass-through to IntSidebar; undefined = corpus counts still loading. */
  counts?: FacetCounts;
}

export function IntMobileFilterDrawer({ isOpen, onClose, counts }: IntMobileFilterDrawerProps) {
  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog open={isOpen} onClose={onClose} className="relative z-[60]">
        <TransitionChild
          as={Fragment}
          enter="transition-opacity duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="int-mobile-filter-backdrop" aria-hidden="true" />
        </TransitionChild>

        <div className="fixed inset-0 z-[61] flex pointer-events-none">
          <TransitionChild
            as={Fragment}
            enter="transition-transform duration-200 ease-out"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition-transform duration-150 ease-in"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <DialogPanel className="int-mobile-filter-drawer pointer-events-auto">
              <div className="int-mobile-filter-drawer-head">
                <span>Filters</span>
                <button
                  type="button"
                  className="int-mobile-filter-drawer-close"
                  onClick={onClose}
                  aria-label="Close filters"
                >
                  <X width={16} height={16} />
                </button>
              </div>
              <IntSidebar counts={counts} />
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
