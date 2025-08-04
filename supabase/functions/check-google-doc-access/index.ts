import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getGoogleAccessToken } from '../_shared/google-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckAccessRequest {
  docId: string;
}

interface CheckAccessResponse {
  hasAccess: boolean;
  reason?: 'no_permission' | 'not_found' | 'error';
  docName?: string;
  message?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { docId } = (await req.json()) as CheckAccessRequest;

    if (!docId) {
      throw new Error('Document ID is required');
    }

    // Check if we have Google service account credentials
    const googleServiceAccount = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');

    if (!googleServiceAccount) {
      // If no service account, we can't check permissions server-side
      // Return a response indicating client-side check is needed
      return new Response(
        JSON.stringify({
          hasAccess: null,
          reason: 'no_service_account',
          message: 'Permission check requires Google authentication',
        } as CheckAccessResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    try {
      const credentials = JSON.parse(googleServiceAccount);
      const accessToken = await getGoogleAccessToken(credentials);

      // Try to get basic file metadata to check access
      // Using Drive API v3 for simpler permission checking
      const fileResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${docId}?fields=id,name,mimeType,permissions`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (fileResponse.status === 404) {
        return new Response(
          JSON.stringify({
            hasAccess: false,
            reason: 'not_found',
            message: 'Document not found or does not exist',
          } as CheckAccessResponse),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      if (fileResponse.status === 403) {
        return new Response(
          JSON.stringify({
            hasAccess: false,
            reason: 'no_permission',
            message: 'You do not have permission to access this document',
          } as CheckAccessResponse),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      if (!fileResponse.ok) {
        const errorText = await fileResponse.text();
        console.error(`Google Drive API error: ${fileResponse.status} - ${errorText}`);
        throw new Error(`Google Drive API error: ${fileResponse.status}`);
      }

      const fileData = await fileResponse.json();

      // Check if it's actually a Google Doc
      if (fileData.mimeType !== 'application/vnd.google-apps.document') {
        return new Response(
          JSON.stringify({
            hasAccess: false,
            reason: 'error',
            message: 'The specified file is not a Google Doc',
          } as CheckAccessResponse),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      // If we got here, we have access
      return new Response(
        JSON.stringify({
          hasAccess: true,
          docName: fileData.name,
          message: 'Document is accessible',
        } as CheckAccessResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (error) {
      console.error('Google API error:', error);

      // Check if it's an auth error
      if (error.message?.includes('Failed to get access token')) {
        return new Response(
          JSON.stringify({
            hasAccess: false,
            reason: 'error',
            message: 'Authentication failed. Please check service account configuration.',
          } as CheckAccessResponse),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      throw error;
    }
  } catch (error) {
    console.error('Error checking document access:', error);
    return new Response(
      JSON.stringify({
        hasAccess: false,
        reason: 'error',
        message: error.message || 'Failed to check document access',
      } as CheckAccessResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 with error in body to avoid CORS issues
      }
    );
  }
});
