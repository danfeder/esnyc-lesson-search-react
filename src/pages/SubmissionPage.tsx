import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus, Edit3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AuthModal } from '@/components/Auth/AuthModal';
import { IntPageHeader } from '@/components/Internal';
import { User } from '@supabase/supabase-js';

type Intent = 'new' | 'revising';

export function SubmissionPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [pendingIntent, setPendingIntent] = useState<Intent | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleIntent = (intent: Intent) => {
    if (!user) {
      setPendingIntent(intent);
      setShowAuthModal(true);
      return;
    }
    navigate(`/submit/${intent}`);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    if (pendingIntent) {
      navigate(`/submit/${pendingIntent}`);
      setPendingIntent(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <IntPageHeader title="Submit a lesson" />
      <p className="text-gray-600 mb-8">
        Submit a Google Doc lesson plan for the ESYNYC library. A reviewer will check it and either
        publish it or get back to you.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mb-4">What are you submitting?</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => handleIntent('new')}
          className="text-left p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 focus:border-blue-500 focus:outline-none transition"
        >
          <FilePlus size={28} className="text-blue-600 mb-3" />
          <div className="font-semibold text-lg text-gray-900 mb-1">
            Add a new lesson to the library
          </div>
          <div className="text-sm text-gray-600">
            Use this if no version of this lesson has been added yet.
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleIntent('revising')}
          className="text-left p-6 border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 focus:border-emerald-500 focus:outline-none transition"
        >
          <Edit3 size={28} className="text-emerald-600 mb-3" />
          <div className="font-semibold text-lg text-gray-900 mb-1">
            Update a lesson that's already in the library
          </div>
          <div className="text-sm text-gray-600">
            Use this if a version of your lesson is already published.
          </div>
        </button>
      </div>

      {/* Reassurance so an unsure submitter doesn't stall on the choice — either
          path lands in the same reviewer queue. */}
      <p className="text-sm text-gray-600 mt-4">
        Not sure? Pick either — a reviewer checks everything.
      </p>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setPendingIntent(null);
        }}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
