/**
 * Enhanced logger utility with Sentry integration
 * Provides consistent logging across development and production
 */
import { captureException, captureMessage, addBreadcrumb } from '@/lib/sentry';
import type { SeverityLevel } from '@sentry/types';

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// Configurable list of sensitive keys for data sanitization
const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'key',
  'auth',
  'authorization',
  'cookie',
  'session',
  'email',
  'phone',
  'ssn',
  'credit_card',
  'api_key',
  'private_key',
  'access_token',
  'refresh_token',
];

/**
 * Sanitize sensitive data from log arguments
 */
function sanitizeArgs(args: unknown[]): unknown[] {
  return args.map((arg) => {
    if (typeof arg === 'string') {
      // JWT tokens (more specific pattern)
      if (arg.match(/^ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)) {
        return '[REDACTED JWT]';
      }
      // API keys and tokens (common patterns)
      if (arg.match(/^(sk|pk|pat|ghp|gho|ghs|ghu)_[A-Za-z0-9]{20,}$/)) {
        return '[REDACTED API KEY]';
      }
      // Check for sensitive keywords
      const lowerArg = arg.toLowerCase();
      if (SENSITIVE_KEYS.some((key) => lowerArg.includes(key))) {
        return '[REDACTED]';
      }
    }

    if (typeof arg === 'object' && arg !== null) {
      // Deep clone and sanitize objects
      try {
        const cloned = JSON.parse(JSON.stringify(arg));
        return sanitizeObject(cloned);
      } catch {
        return '[OBJECT]';
      }
    }

    return arg;
  });
}

/**
 * Recursively sanitize sensitive keys from objects
 */
function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  for (const key in obj) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
      obj[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object') {
      obj[key] = sanitizeObject(obj[key]);
    }
  }

  return obj;
}

/**
 * Convert log arguments to a message string
 */
function argsToMessage(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(' ');
}

export const logger = {
  /**
   * Debug level logging - verbose information for debugging
   */
  debug: (...args: unknown[]) => {
    const sanitized = sanitizeArgs(args);

    if (isDevelopment) {
      console.log('[DEBUG]', ...sanitized);
    }

    // Add as breadcrumb in production for context
    if (isProduction) {
      addBreadcrumb({
        message: argsToMessage(sanitized),
        level: 'debug' as SeverityLevel,
        category: 'console',
      });
    }
  },

  /**
   * General logging
   */
  log: (...args: unknown[]) => {
    const sanitized = sanitizeArgs(args);

    if (isDevelopment) {
      console.log(...sanitized);
    }

    // Add as breadcrumb in production for context
    if (isProduction) {
      addBreadcrumb({
        message: argsToMessage(sanitized),
        level: 'info' as SeverityLevel,
        category: 'console',
      });
    }
  },

  /**
   * Info level logging - informational messages
   */
  info: (...args: unknown[]) => {
    const sanitized = sanitizeArgs(args);

    if (isDevelopment) {
      console.info(...sanitized);
    }

    // In production, only capture important info messages
    if (isProduction) {
      const message = argsToMessage(sanitized);
      if (message.includes('success') || message.includes('complete')) {
        captureMessage(message, 'info');
      } else {
        addBreadcrumb({
          message,
          level: 'info' as SeverityLevel,
          category: 'console',
        });
      }
    }
  },

  /**
   * Warning level logging - potential issues but not errors
   */
  warn: (...args: unknown[]) => {
    const sanitized = sanitizeArgs(args);

    if (isDevelopment) {
      console.warn(...sanitized);
    }

    // Capture warnings in production
    if (isProduction) {
      captureMessage(argsToMessage(sanitized), 'warning');
    }
  },

  /**
   * Error level logging - actual errors
   */
  error: (...args: unknown[]) => {
    const sanitized = sanitizeArgs(args);

    // Always log errors to console
    console.error(...sanitized);

    // Capture errors in production
    if (isProduction) {
      // Check if first argument is an Error object
      const firstArg = args[0];
      if (firstArg instanceof Error) {
        captureException(firstArg, {
          extra: {
            additionalArgs: sanitized.slice(1),
          },
        });
      } else {
        // Convert to error message
        captureMessage(argsToMessage(sanitized), 'error');
      }
    }
  },

  /**
   * Track specific events or metrics
   */
  track: (eventName: string, data?: Record<string, unknown>) => {
    const sanitizedData = data ? sanitizeObject({ ...data }) : undefined;

    if (isDevelopment) {
      console.log(`[TRACK] ${eventName}`, sanitizedData);
    }

    // In production, add as breadcrumb for context
    if (isProduction) {
      addBreadcrumb({
        message: eventName,
        category: 'track',
        level: 'info' as SeverityLevel,
        data: sanitizedData,
      });
    }
  },
};
