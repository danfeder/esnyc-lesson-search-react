// Icon mapping from lucide-react to @heroicons/react
// This file helps maintain consistency in icons across the application

export const iconMapping = {
  // lucide-react -> @heroicons/react mapping
  'ChevronDown': 'ChevronDownIcon',
  'ChevronRight': 'ChevronRightIcon',
  'X': 'XMarkIcon',
  'ExternalLink': 'ArrowTopRightOnSquareIcon',
  'Clock': 'ClockIcon',
  'Users': 'UsersIcon',
  'MapPin': 'MapPinIcon',
  'ChefHat': 'FireIcon', // Using Fire as a cooking icon
  'Sprout': 'SparklesIcon', // Using Sparkles as a garden icon
  
  // Import paths
  lucideImport: 'lucide-react',
  heroiconsOutlineImport: '@heroicons/react/24/outline',
  heroiconsSolidImport: '@heroicons/react/24/solid',
};

// Helper to get the correct import for heroicons
export const getHeroiconImport = (variant: 'outline' | 'solid' = 'outline') => {
  return variant === 'outline' 
    ? `@heroicons/react/24/outline`
    : `@heroicons/react/24/solid`;
};