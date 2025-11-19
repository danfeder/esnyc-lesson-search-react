import { Save } from 'lucide-react';

interface ReviewActionsProps {
  decision: 'approve_new' | 'approve_update' | 'reject' | 'needs_revision';
  setDecision: (decision: 'approve_new' | 'approve_update' | 'reject' | 'needs_revision') => void;
  notes: string;
  setNotes: (notes: string) => void;
  onSave: () => void;
  saving: boolean;
  hasSelectedDuplicate: boolean;
  validationErrors: string[];
}

export function ReviewActions({
  decision,
  setDecision,
  notes,
  setNotes,
  onSave,
  saving,
  hasSelectedDuplicate,
  validationErrors,
}: ReviewActionsProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky bottom-6">
      <h2 className="text-lg font-semibold mb-4">Review Decision</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
          <select
            value={decision}
            onChange={(e) => setDecision(e.target.value as any)}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="approve_new">Approve as New Lesson</option>
            <option value="approve_update" disabled={!hasSelectedDuplicate}>
              Approve as Update to Existing Lesson{' '}
              {!hasSelectedDuplicate && '(Select a duplicate first)'}
            </option>
            <option value="needs_revision">Request Revision</option>
            <option value="reject">Reject Submission</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Review Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Add internal notes or feedback for the teacher..."
          />
        </div>

        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Please fix the following errors:
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc pl-5 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onSave}
          disabled={saving || (decision === 'approve_update' && !hasSelectedDuplicate)}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-colors ${
            saving || (decision === 'approve_update' && !hasSelectedDuplicate)
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          <Save size={20} />
          {saving ? 'Saving Review...' : 'Complete Review'}
        </button>
      </div>
    </div>
  );
}
