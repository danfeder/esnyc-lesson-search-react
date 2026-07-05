import { describe, it, expect, vi } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  describe('sanitizeObject (via logger.debug)', () => {
    it('does not mutate the input data object', () => {
      // Suppress console output during test
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const input = { name: 'test', password: 'secret123', count: 42 };
      const original = { ...input };

      logger.debug('test-event', input);

      expect(input).toEqual(original);

      vi.restoreAllMocks();
    });

    it('does not mutate nested objects in input data', () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const nested = { token: 'abc123', value: 'keep' };
      const input = { info: nested, name: 'test' };
      const originalNested = { ...nested };

      logger.debug('test-event', input);

      expect(nested).toEqual(originalNested);

      vi.restoreAllMocks();
    });

    it('redacts sensitive keys in log output', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      logger.debug('test-event', { password: 'secret', name: 'test' });

      expect(logSpy).toHaveBeenCalledWith(
        '[DEBUG]',
        'test-event',
        expect.objectContaining({
          password: '[REDACTED]',
          name: 'test',
        })
      );

      vi.restoreAllMocks();
    });
  });

  // FP4 Brief 4 item 1: the SENSITIVE_KEYS substring redaction must NOT clobber
  // arg[0] (the human-written label position by repo convention). It still fires
  // on later value args, and the JWT / API-key regexes still redact in any
  // position — including the label.
  describe('label (arg[0]) vs value (arg[1+]) redaction', () => {
    // Real labels from the call sites in the brief — each contains a
    // SENSITIVE_KEYS substring ("auth" / "password" / "key" / "email") and was
    // being whole-string redacted before this fix.
    const REAL_LABELS = [
      'Error checking auth state:',
      'Error updating password:',
      'VITE_SUPABASE_ANON_KEY:',
      'Failed to resend invitation email:',
      'Failed to send invitation email:',
      'Error invoking email function:',
      'Error loading invitations:',
    ];

    it.each(REAL_LABELS)('prints the real label %j intact at arg[0]', (label) => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.error(label);

      expect(errSpy).toHaveBeenCalledWith(label);

      vi.restoreAllMocks();
    });

    it('keeps the label but redacts a sensitive VALUE in a later arg', () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.error('Error updating password:', 'my password is hunter2');

      // arg[0] label survives; arg[1] value hits SENSITIVE_KEYS → redacted.
      expect(errSpy).toHaveBeenCalledWith('Error updating password:', '[REDACTED]');

      vi.restoreAllMocks();
    });

    it('redacts JWT and API-key shaped strings in ANY position, including arg[0]', () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const jwt =
        'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NSJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJVadQssw5c';
      const apiKey = 'sk_abcdefghij0123456789ABCD';

      // Position 0 (would-be label) still redacts value-shaped secrets.
      logger.error(jwt);
      expect(errSpy).toHaveBeenCalledWith('[REDACTED JWT]');

      // Position 1 too.
      logger.error('Auth token:', apiKey);
      expect(errSpy).toHaveBeenCalledWith('Auth token:', '[REDACTED API KEY]');

      vi.restoreAllMocks();
    });
  });
});
