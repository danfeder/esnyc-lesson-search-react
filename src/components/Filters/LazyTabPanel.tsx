import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';

interface LazyTabPanelProps {
  children: React.ReactNode;
  className?: string;
  index: number;
  selectedIndex: number;
}

export const LazyTabPanel: React.FC<LazyTabPanelProps> = ({
  children,
  className,
  index,
  selectedIndex,
}) => {
  const [hasBeenSelected, setHasBeenSelected] = useState(index === selectedIndex);

  useEffect(() => {
    if (index === selectedIndex && !hasBeenSelected) {
      setHasBeenSelected(true);
    }
  }, [index, selectedIndex, hasBeenSelected]);

  return (
    <Tab.Panel className={className}>
      {hasBeenSelected ? children : <div className="h-full" />}
    </Tab.Panel>
  );
};
