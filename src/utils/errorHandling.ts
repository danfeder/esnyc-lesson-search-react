/**
 * Database error handling utilities
 */

import { PostgrestError } from '@supabase/supabase-js';

/**
 * Parse database errors and return user-friendly messages
 */
export function parseDbError(error: PostgrestError | Error | unknown): string {
  // Handle PostgrestError from Supabase
  if (error && typeof error === 'object' && 'code' in error) {
    const pgError = error as PostgrestError;

    // Handle unique constraint violations
    if (pgError.code === '23505') {
      // Check if it's specifically the email constraint
      if (
        pgError.message?.includes('idx_user_profiles_email_unique') ||
        pgError.message?.includes('email')
      ) {
        return 'This email address is already registered to another user.';
      }
      return 'This value already exists. Please use a different value.';
    }

    // Handle foreign key violations
    if (pgError.code === '23503') {
      return 'Related data not found. Please check your input.';
    }

    // Handle check constraint violations
    if (pgError.code === '23514') {
      return 'Invalid value provided. Please check your input.';
    }

    // Handle not null violations
    if (pgError.code === '23502') {
      return 'Required field is missing. Please fill in all required fields.';
    }

    // Return the original message for other database errors
    if (pgError.message) {
      return pgError.message;
    }
  }

  // Handle regular Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Default message for unknown errors
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Check if an error is specifically an email uniqueness constraint violation
 */
export function isEmailDuplicateError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    const pgError = error as PostgrestError;
    return (
      pgError.code === '23505' &&
      (pgError.message?.includes('idx_user_profiles_email_unique') ||
        pgError.message?.includes('email'))
    );
  }
  return false;
}
