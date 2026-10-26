// Shared in-code auth gate for edge functions. Every function deploys with
// --no-verify-jwt (.github/workflows/deploy-edge-functions.yml), so the
// platform does not authenticate callers; a function that holds the
// service-role key must gate itself. Two gates:
//   isServiceRoleToken   — constant-time compare of the bearer against the
//                          service-role key (server-to-server callers).
//   requireUserWithRole  — resolve the bearer to an auth user and optionally
//                          check user_profiles.role against an allowlist.
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

export type UserGateFailure = 'invalid_token' | 'no_profile' | 'insufficient_role';
export type UserGate =
  | { ok: true; user: GateUser; role: string | null; fullName: string | null }
  | { ok: false; reason: UserGateFailure };

// allowedRoles === null → any authenticated user; no profile lookup (fullName null).
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
    .select('role, full_name')
    .eq('id', user.id)
    .single();
  if (!profile) return { ok: false, reason: 'no_profile' };
  if (!allowedRoles.includes(profile.role)) return { ok: false, reason: 'insufficient_role' };
  return { ok: true, user, role: profile.role, fullName: profile.full_name ?? null };
}
