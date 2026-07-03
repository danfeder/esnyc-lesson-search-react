import * as Sentry from '@sentry/react';

/**
 * Sentry configuration for error tracking and monitoring
 * Only initializes in production environment
 */

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// Sentry DSN should be set in environment variables
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

/**
 * Initialize Sentry for error tracking
 * Should be called early in the application lifecycle
 */
export function initSentry() {
  // Only initialize in production with a valid DSN
  if (!isProduction || !SENTRY_DSN) {
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.log('[Sentry] Skipping initialization in development mode');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,

    // Performance Monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Mask all text content for privacy
        maskAllText: true,
        // Block all media for privacy
        blockAllMedia: true,
      }),
    ],

    // Performance sampling
    tracesSampleRate: 0.1, // 10% of transactions for performance monitoring

    // Session Replay sampling (for error diagnosis)
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Data sanitization
    beforeSend(event) {
      // Sanitize sensitive data
      if (event.request) {
        // Remove auth headers
        if (event.request.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['Cookie'];
        }

        // Sanitize URLs containing tokens
        if (event.request.url) {
          event.request.url = sanitizeUrl(event.request.url);
        }
      }

      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data) {
            breadcrumb.data = sanitizeData(breadcrumb.data) as Record<string, unknown>;
          }
          return breadcrumb;
        });
      }

      // Remove sensitive context
      if (event.extra) {
        event.extra = sanitizeData(event.extra) as Record<string, unknown>;
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'Non-Error promise rejection captured',
      // Network errors that are expected
      'NetworkError',
      'Failed to fetch',
      // User cancelled actions
      'AbortError',
    ],
  });
}

/**
 * Sanitize URLs by removing sensitive query parameters
 */
function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const sensitiveParams = ['token', 'key', 'secret', 'password', 'auth'];

    sensitiveParams.forEach((param) => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    });

    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Recursively sanitize object data
 */
function sanitizeData(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'auth',
    'authorization',
    'cookie',
    'session',
    'email', // PII
    'phone', // PII
    'ssn', // PII
    'credit_card', // PII
  ];

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item));
  }

  const sanitized: Record<string, unknown> = { ...(data as Record<string, unknown>) };

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();

    // Check if this key contains sensitive data
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Log levels for the application
 */

/**
 * Capture an exception with Sentry
 */
export function captureException(error: Error | unknown, context?: Record<string, unknown>) {
  if (isProduction && SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    });
  }

  // Also log to console in development
  if (isDevelopment) {
    console.error('[Error]', error, context);
  }
}

/**
 * Capture a message with Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (isProduction && SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }

  // Also log to console in development
  if (isDevelopment) {
    const consoleMethod = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log';
    // eslint-disable-next-line no-console
    console[consoleMethod](`[${level}]`, message);
  }
}

/**
 * Add breadcrumb for better error context
 */
export function addBreadcrumb(breadcrumb: {
  message: string;
  category?: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, unknown>;
}) {
  if (isProduction && SENTRY_DSN) {
    Sentry.addBreadcrumb({
      ...breadcrumb,
      data: breadcrumb.data
        ? (sanitizeData(breadcrumb.data) as Record<string, unknown>)
        : undefined,
    });
  }

  // Also log to console in development
  if (isDevelopment) {
    // eslint-disable-next-line no-console
    console.log('[Breadcrumb]', breadcrumb);
  }
}
