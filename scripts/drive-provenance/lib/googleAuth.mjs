/**
 * Node-side Google service-account auth with domain-wide delegation (Drive
 * provenance, Phase 5 — supervised local tooling only; the deployed runtime
 * uses supabase/functions/_shared/google-auth-with-delegation.ts instead).
 *
 * SCOPES ARE CALLER-SUPPLIED AND EXPLICIT. The metadata path uses the same
 * Docs/Drive readonly pair as the deployed reader; the Activity scope is only
 * ever passed by the supervised backfill path with an explicitly-supplied
 * impersonation subject. Nothing here logs tokens or key material.
 */

import { createSign } from 'node:crypto';

export const METADATA_SCOPES =
  'https://www.googleapis.com/auth/documents.readonly https://www.googleapis.com/auth/drive.readonly';
export const ACTIVITY_SCOPE = 'https://www.googleapis.com/auth/drive.activity.readonly';

function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function getGoogleAccessToken(serviceAccount, scopes, impersonateEmail) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT', kid: serviceAccount.private_key_id };
  const payload = {
    iss: serviceAccount.client_email,
    scope: scopes,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
    ...(impersonateEmail ? { sub: impersonateEmail } : {}),
  };
  const signatureInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signatureInput);
  const signature = signer.sign(serviceAccount.private_key);
  const jwt = `${signatureInput}.${base64url(signature)}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!response.ok) {
    // Deliberately do NOT include the response body (may echo identifying
    // detail) — status is enough to diagnose scope/subject problems.
    throw new Error(`Google token exchange failed with HTTP ${response.status}`);
  }
  const data = await response.json();
  if (!data.access_token) throw new Error('Google token exchange returned no access_token');
  return data.access_token;
}
