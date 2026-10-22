import { supabase } from '@/lib/supabase';
import { DEFAULT_PERMISSIONS, UserRole } from '@/types/auth';
import { logger } from '@/utils/logger';

/**
 * Permissions listed in an invitation email for a role. Derived from the
 * canonical DEFAULT_PERMISSIONS (types/auth.ts) so the invite and resend
 * emails can never drift from each other or from what the role actually
 * gets. Unknown roles fall back to the teacher list (the old pages' default).
 */
export function getPermissionsForRole(role: string): string[] {
  return DEFAULT_PERMISSIONS[role as UserRole] ?? DEFAULT_PERMISSIONS[UserRole.TEACHER];
}

export interface InvitationEmailParams {
  to: string;
  invitationId: string;
  token: string;
  /** May be undefined when the inviter has neither full_name nor email — kept
      optional so the payload is byte-identical to the pre-helper pages. */
  inviterName?: string;
  role: string;
  expiresAt: string;
  customMessage?: string;
}

/**
 * Sends the invitation email through the send-email edge function.
 * NEVER throws: callers have already written the invitation row + audit row
 * and must not unwind them (re-throwing would prompt a retry that
 * double-extends expires_at / duplicates the audit row). supabase.functions
 * .invoke resolves (does not throw) on non-2xx — the failure is in `error` —
 * so both paths are checked. Returns whether delivery succeeded.
 */
export async function sendInvitationEmail(params: InvitationEmailParams): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        type: 'invitation',
        to: params.to,
        data: {
          invitationId: params.invitationId,
          token: params.token,
          inviterName: params.inviterName,
          role: params.role,
          customMessage: params.customMessage,
          permissions: getPermissionsForRole(params.role),
          expiresAt: params.expiresAt,
        },
      },
    });
    if (error) {
      logger.error('Failed to send invitation email:', error);
      return false;
    }
    return true;
  } catch (err) {
    logger.error('Failed to send invitation email:', err);
    return false;
  }
}
