// Shared CORS configuration for edge functions
// Use restrictedCors for authenticated/internal endpoints
// Use publicCors for public-facing endpoints (search, embeddings)

const ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [
  'http://localhost:5173',
  'https://esynyc-lessonlibrary-v2.netlify.app',
  'https://deploy-preview-*--esynyc-lessonlibrary-v2.netlify.app',
];

function isAllowedOrigin(origin: string | null): origin is string {
  return !!(
    origin &&
    (ALLOWED_ORIGINS.includes(origin) ||
      ALLOWED_ORIGINS.some(
        (allowed) =>
          allowed.includes('*') &&
          origin.match(
            new RegExp(
              '^' +
                allowed
                  .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                  .replace(/\\\*/g, '[a-z0-9-]+') +
                '$'
            )
          )
      ))
  );
}

export function getRestrictedCorsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

export const publicCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
