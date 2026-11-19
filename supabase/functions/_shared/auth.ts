// Shared in-code auth gate for edge functions. Every function deploys with
// --no-verify-jwt (.github/workflows/deploy-edge-functions.yml), so the
// platform does not authenticate callers; a function that holds the
// service-role key must gate itself. Two gates:
//   isServiceRoleToken   — constant-time compare of the bearer against the
//                          service-role key (server-to-server callers).
//   requireUserWithRole  — resolve the bearer to an auth user and optionally
//                          check user_profiles.role against an allowlist. With
//                          an allowlist, the profile must also be ACTIVE: a
//                          deactivated account is refused whatever its role.
// Both return results, not Responses: each function keeps its own status
// codes and error-body shape, so adopting them changes no wire contract.
// deno-lint-ignore-file no-explicit-any
import { timingSafeEqual } from './timing-safe-equal.ts';

export interface GateUser {
  id: string;
  email?: string;
}

// Structural subset of a supabase-js client (any 2.x pin satisfies it).
export interface GateClient {
  auth: { getUser(jwt: string): Promise<{ data: { user: any }; error: any }> };
  from(table: string): any;
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get('Authorization');
  if (!header) return null;
  return header.replace('Bearer ', '');
}

export function isServiceRoleToken(token: string, serviceRoleKey: string): boolean {
  const enc = new TextEncoder();
  return timingSafeEqual(enc.encode(token), enc.encode(serviceRoleKey));
}

export type UserGateFailure = 'invalid_token' | 'no_profile' | 'inactive' | 'insufficient_role';

// Every role a profile can hold. Pass as the allowlist to mean "any signed-in
// user who has an active profile", as opposed to `null`, which skips the
// profile lookup entirely and so cannot tell an active account from a
// deactivated one.
export const ANY_ACTIVE_ROLE = ['teacher', 'reviewer', 'admin', 'super_admin'] as const;
export type UserGate =
  | { ok: true; user: GateUser; role: string | null; fullName: string | null }
  | { ok: false; reason: UserGateFailure };

// allowedRoles === null → any authenticated user; no profile lookup (fullName
// null), so NO active check. Prefer ANY_ACTIVE_ROLE unless the caller truly
// must work for an account that has no profile yet.
export async function requireUserWithRole(
  client: GateClient,
  token: string,
  allowedRoles: readonly string[] | null
): Promise<UserGate> {
  const { data, error } = await client.auth.getUser(token);
  const user = data?.user as GateUser | null | undefined;
  if (error || !user) return { ok: false, reason: 'invalid_token' };
  if (allowedRoles === null) return { ok: true, user, role: null, fullName: null };

  const { data: profile } = await client
    .from('user_profiles')
    .select('role, full_name, is_active')
    .eq('id', user.id)
    .single();
  if (!profile) return { ok: false, reason: 'no_profile' };
  // Matches the database helpers (is_admin(), is_reviewer_or_above()): only an
  // explicit `false` deactivates; NULL is treated as active.
  if (profile.is_active === false) return { ok: false, reason: 'inactive' };
  if (!allowedRoles.includes(profile.role)) return { ok: false, reason: 'insufficient_role' };
  return { ok: true, user, role: profile.role, fullName: profile.full_name ?? null };
}
