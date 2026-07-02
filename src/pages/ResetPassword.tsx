import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { parseDbError } from '@/utils/errorHandling';
import { Lock, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { IntAuthShell, IntButton, IntFormField } from '@/components/Internal';

export function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [hasValidToken, setHasValidToken] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session) {
          setError('This reset link is invalid or expired. Request a new one to continue.');
          setHasValidToken(false);
        } else {
          setHasValidToken(true);
        }
      } catch {
        setError('Unable to verify the reset link. Try again in a moment.');
        setHasValidToken(false);
      } finally {
        setVerifying(false);
      }
    };

    checkToken();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // Password-changed notification email retired for launch per T3
      // (2026-07-01); the custom password-reset edge function has been deleted.
      setSuccess(true);
      await supabase.auth.signOut();

      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      setError(parseDbError(err));
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <IntAuthShell
        title="Verifying your reset link"
        description="One moment while we check the link."
        icon={<Loader2 className="w-5 h-5 adm-spin" aria-hidden="true" />}
      >
        <p className="adm-auth-quiet">This usually takes less than a second.</p>
      </IntAuthShell>
    );
  }

  if (!hasValidToken) {
    return (
      <IntAuthShell
        tone="red"
        icon={<XCircle className="w-5 h-5" aria-hidden="true" />}
        title="Reset link isn't valid"
        description={error ?? 'This link can no longer be used.'}
        footer={
          <IntButton variant="primary" onClick={() => navigate('/')}>
            Back to sign in
          </IntButton>
        }
        caption={
          <>
            Links expire after 24 hours. Use "Forgot password?" on the sign-in screen to get a fresh
            one. Still stuck? <a href="mailto:support@edibleschoolyardnyc.org">Email support</a>.
          </>
        }
      >
        <p className="adm-auth-quiet">
          You'll get a fresh email with a new link within a few minutes.
        </p>
      </IntAuthShell>
    );
  }

  if (success) {
    return (
      <IntAuthShell
        tone="green"
        icon={<CheckCircle className="w-5 h-5" aria-hidden="true" />}
        title="Password reset"
        description="You can now sign in with your new password."
      >
        <p className="adm-auth-quiet">Taking you to the sign-in page…</p>
      </IntAuthShell>
    );
  }

  return (
    <IntAuthShell
      icon={<Lock className="w-5 h-5" aria-hidden="true" />}
      title="Choose a new password"
      description="Make it at least 6 characters. We recommend a passphrase you can remember."
      footer={
        <button type="button" className="adm-link" onClick={() => navigate('/')}>
          ← Back to sign in
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="adm-auth-form">
        {error && (
          <div className="adm-auth-alert" role="alert">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <IntFormField label="New password" required hint="At least 6 characters.">
          <input
            type="password"
            className="adm-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </IntFormField>

        <IntFormField label="Confirm password" required>
          <input
            type="password"
            className="adm-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </IntFormField>

        <div className="adm-auth-submit">
          <IntButton
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
            className="adm-btn--block"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 adm-spin" aria-hidden="true" />
                Resetting password…
              </>
            ) : (
              'Reset password'
            )}
          </IntButton>
        </div>
      </form>
    </IntAuthShell>
  );
}
