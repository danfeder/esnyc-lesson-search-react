/**
 * Small auth predicates shared between admin surfaces.
 */

const ADMIN_REVIEWER_ROLES = new Set(['admin', 'reviewer', 'super_admin']);

/**
 * Returns true for any role permitted to access duplicate-management surfaces.
 * Centralizes the duplicated `role === 'admin' || role === 'reviewer' || role === 'super_admin'`
 * pattern so changes happen in one place.
 */
export function hasAdminOrReviewerAccess(role?: string | null): boolean {
  return !!role && ADMIN_REVIEWER_ROLES.has(role);
}
