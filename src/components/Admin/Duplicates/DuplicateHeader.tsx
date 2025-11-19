import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, Users, AlertTriangle, BookOpen, Calendar } from 'lucide-react';
import { CATEGORY_INFO, COLOR_CLASSES } from '../../../utils/duplicateConstants';
import type { DuplicateGroup } from '../../../types/admin';

interface DuplicateHeaderProps {
  group: DuplicateGroup;
}

export function DuplicateHeader({ group }: DuplicateHeaderProps) {
  const navigate = useNavigate();
  const categoryInfo = CATEGORY_INFO[group.category] || CATEGORY_INFO['PEDAGOGICAL_VARIATIONS'];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Check':
        return <Check className="w-5 h-5" />;
      case 'Users':
        return <Users className="w-5 h-5" />;
      case 'AlertTriangle':
        return <AlertTriangle className="w-5 h-5" />;
      case 'BookOpen':
        return <BookOpen className="w-5 h-5" />;
      case 'Calendar':
        return <Calendar className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
    }
  };

  return (
    <div className="mb-6">
      <button
        onClick={() => navigate('/admin/duplicates')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Duplicates
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Duplicate Group: {group.groupId}</h1>
          <p className="text-gray-600 mt-1">{group.lessons.length} lessons in group</p>
        </div>

        {/* Category Badge */}
        <div
          className={`px-4 py-2 rounded-lg ${COLOR_CLASSES[categoryInfo.color]?.split(' ').slice(0, 2).join(' ')}`}
        >
          <div className="flex items-center space-x-2">
            <span className={`${COLOR_CLASSES[categoryInfo.color]?.split(' ')[3]}`}>
              {getIcon(categoryInfo.iconName)}
            </span>
            <div>
              <p className={`font-medium ${COLOR_CLASSES[categoryInfo.color]?.split(' ')[2]}`}>
                {categoryInfo.label}
              </p>
              <p className={`text-sm ${COLOR_CLASSES[categoryInfo.color]?.split(' ')[4]}`}>
                Confidence: {group.confidence}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Explanation */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
        <h3 className="font-medium text-gray-900 mb-2">Category Analysis</h3>
        <p className="text-gray-700">{categoryInfo.description}</p>
      </div>
    </div>
  );
}
