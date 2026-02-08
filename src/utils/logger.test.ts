import { describe, it, expect, vi } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  describe('sanitizeObject (via logger.track)', () => {
    it('does not mutate the input data object', () => {
      // Suppress console output during test
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const input = { name: 'test', password: 'secret123', count: 42 };
      const original = { ...input };

      logger.track('test-event', input);

      expect(input).toEqual(original);

      vi.restoreAllMocks();
    });

    it('does not mutate nested objects in input data', () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const nested = { token: 'abc123', value: 'keep' };
      const input = { info: nested, name: 'test' };
      const originalNested = { ...nested };

      logger.track('test-event', input);

      expect(nested).toEqual(originalNested);

      vi.restoreAllMocks();
    });

    it('redacts sensitive keys in log output', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      logger.track('test-event', { password: 'secret', name: 'test' });

      expect(logSpy).toHaveBeenCalledWith(
        '[TRACK] test-event',
        expect.objectContaining({
          password: '[REDACTED]',
          name: 'test',
        })
      );

      vi.restoreAllMocks();
    });
  });
});
