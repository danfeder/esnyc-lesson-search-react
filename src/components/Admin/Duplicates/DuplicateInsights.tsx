import { AlertTriangle, Info } from 'lucide-react';
import type { DuplicateGroup } from '../../../types/admin';

interface DuplicateInsightsProps {
  insights: DuplicateGroup['insights'];
}

export function DuplicateInsights({ insights }: DuplicateInsightsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {insights.pedagogicalNotes.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2 flex items-center">
            <Info className="w-4 h-4 mr-2" />
            Pedagogical Notes
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            {insights.pedagogicalNotes.map((note, idx) => (
              <li key={idx}>• {note}</li>
            ))}
          </ul>
        </div>
      )}

      {insights.keyDifferences.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-900 mb-2">Key Differences</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            {insights.keyDifferences.map((diff, idx) => (
              <li key={idx}>• {diff}</li>
            ))}
          </ul>
        </div>
      )}

      {insights.qualityIssues.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-medium text-red-900 mb-2 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Quality Issues
          </h3>
          <ul className="text-sm text-red-800 space-y-1">
            {insights.qualityIssues.map((issue, idx) => (
              <li key={idx}>• {issue}</li>
            ))}
          </ul>
        </div>
      )}

      {insights.commonElements.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-medium text-green-900 mb-2">Common Elements</h3>
          <ul className="text-sm text-green-800 space-y-1">
            {insights.commonElements.map((element, idx) => (
              <li key={idx}>• {element}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
