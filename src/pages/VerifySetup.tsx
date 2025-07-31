import { useState } from 'react';
import { verifyUserManagementSetup, setupAdminUser } from '../utils/verifyUserManagement';
import { CheckCircle, XCircle, AlertCircle, Shield } from 'lucide-react';

export function VerifySetup() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');

  const runVerification = async () => {
    setLoading(true);
    const checks = await verifyUserManagementSetup();
    setResults(checks);
    setLoading(false);
  };

  const makeAdmin = async () => {
    if (adminEmail) {
      await setupAdminUser(adminEmail);
      // Re-run verification to see updated status
      runVerification();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Shield className="w-6 h-6" />
          User Management Setup Verification
        </h1>

        <div className="mb-6">
          <button
            onClick={runVerification}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Running Checks...' : 'Run Verification'}
          </button>
        </div>

        {results && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Results:</h2>

            <div className="space-y-2">
              {Object.entries(results).map(([check, passed]) => (
                <div key={check} className="flex items-center gap-2">
                  {passed ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={passed ? 'text-green-700' : 'text-red-700'}>
                    {check.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600 mb-2">
                Check the browser console for detailed output
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Make User Admin</h3>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="user@example.com (or leave empty for current user)"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            />
            <button
              onClick={makeAdmin}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Make Admin
            </button>
          </div>
        </div>

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">Next Steps:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Make sure all checks pass</li>
                <li>Make yourself an admin using the form above</li>
                <li>
                  Navigate to <code className="bg-yellow-100 px-1">/admin/users</code> to manage
                  users
                </li>
                <li>Remove this verification page from production</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
