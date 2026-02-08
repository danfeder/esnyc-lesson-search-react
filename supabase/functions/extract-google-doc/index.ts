import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getGoogleAccessToken } from '../_shared/google-auth-with-delegation.ts';
import {
  extractTextFromGoogleDoc,
  extractMetadataFromContent,
} from '../_shared/google-docs-parser.ts';
import { getRestrictedCorsHeaders } from '../_shared/cors.ts';

interface ExtractRequest {
  googleDocUrl: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getRestrictedCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication — this function should only be invoked internally
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the caller is using service role key or a valid user token
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const token = authHeader.replace('Bearer ', '');
    const isServiceRole = token === supabaseServiceKey;

    if (!isServiceRole) {
      // Verify user token
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid authentication token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { googleDocUrl } = (await req.json()) as ExtractRequest;

    // Extract Google Doc ID from URL
    const docIdMatch = googleDocUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    if (!docIdMatch) {
      throw new Error('Invalid Google Doc URL');
    }
    const docId = docIdMatch[1];

    // Check if we should use real Google Docs API
    const googleServiceAccount = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');

    if (googleServiceAccount) {
      try {
        console.log('Attempting to use Google Docs API...');
        const credentials = JSON.parse(googleServiceAccount);
        console.log('Service account email:', credentials.client_email);

        // Get the email to impersonate from environment variable
        // This should be a user in your @esynyc.org domain
        const impersonateEmail =
          Deno.env.get('GOOGLE_IMPERSONATE_EMAIL') || 'docs-reader@esynyc.org';
        console.log('Impersonating user:', impersonateEmail);

        const accessToken = await getGoogleAccessToken(credentials, impersonateEmail);
        console.log('Successfully obtained access token with domain-wide delegation');

        // Get document from Google Docs API
        const docResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!docResponse.ok) {
          const errorText = await docResponse.text();
          console.error(`Google Docs API error: ${docResponse.status} - ${errorText}`);

          // Check if it's a permission error
          if (docResponse.status === 403) {
            // Return error instead of falling back to mock
            return new Response(
              JSON.stringify({
                success: false,
                error:
                  'Document not accessible. Please share the document with the service account or make it public.',
                serviceAccountEmail: credentials.client_email,
                docId,
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
              }
            );
          }
          throw new Error(`Google Docs API error: ${docResponse.status} - ${errorText}`);
        }

        const doc = await docResponse.json();
        const content = extractTextFromGoogleDoc(doc);

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              docId,
              title: doc.title,
              content,
              metadata: {
                wordCount: content.split(/\s+/).length,
                extractionMethod: 'google-api',
                hasImages: doc.inlineObjects ? Object.keys(doc.inlineObjects).length > 0 : false,
              },
              extractedAt: new Date().toISOString(),
            },
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } catch (error) {
        console.error('Google Docs extraction failed:', error);
        // Return the actual error instead of falling back to mock
        return new Response(
          JSON.stringify({
            success: false,
            error: `Google API extraction failed: ${error.message}`,
            fallbackReason: 'Google service account configured but extraction failed',
            docId,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    } else {
      console.log('GOOGLE_SERVICE_ACCOUNT_JSON not configured, using mock data');
    }

    // Fallback mock data for local development when Google credentials not configured
    // This helps developers test the submission flow without needing Google API setup
    const mockLessons = [
      {
        title: 'Garden-Based Math: Measuring Plant Growth',
        content: `
Grade Levels: 3, 4, 5
Theme: Plant Growth & Development
Skills: Measurement, Data Collection, Graphing

Overview:
Students will learn mathematical concepts through hands-on garden activities. They'll measure plant growth over time, create graphs, and analyze patterns in nature.

Materials:
- Rulers or measuring tapes
- Graph paper
- Garden journals
- Various plants at different growth stages

Procedure:
1. Introduction (10 minutes)
   - Discuss why we measure plant growth
   - Review units of measurement

2. Garden Activity (20 minutes)
   - Students measure assigned plants
   - Record data in journals
   - Note observations about plant health

3. Data Analysis (15 minutes)
   - Create growth charts
   - Compare different plants
   - Identify patterns

Assessment:
- Accuracy of measurements
- Quality of graphs
- Understanding of growth patterns

Extensions:
- Calculate average growth rates
- Predict future growth
- Compare indoor vs outdoor plants
        `.trim(),
      },
      {
        title: 'Herbs and Their Healing Properties',
        content: `
Grade Levels: 5, 6, 7
Theme: Plants as Medicine
Cultural Heritage: Multiple traditions
Skills: Research, Traditional Knowledge, Plant Identification

Overview:
Explore the medicinal properties of common garden herbs and their use across different cultures. Students will learn about traditional healing practices while growing their own herb garden.

Herbs Featured:
- Mint (digestive aid)
- Chamomile (calming)
- Basil (anti-inflammatory)
- Lavender (relaxation)

Activities:
1. Herb identification walk
2. Research cultural uses of herbs
3. Create herb fact cards
4. Make herbal tea blends

Safety Note:
Always consult adults before using herbs medicinally. Some plants can cause allergic reactions.
        `.trim(),
      },
    ];

    // Select a random mock lesson
    const mockLesson = mockLessons[Math.floor(Math.random() * mockLessons.length)];

    const mockContent = {
      docId,
      title: mockLesson.title,
      content: mockLesson.content,
      extractedAt: new Date().toISOString(),
      metadata: {
        wordCount: mockLesson.content.split(/\s+/).length,
        extractionMethod: 'mock',
        hasImages: false,
        warning: 'Using mock data - Google service account not configured',
      },
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: mockContent,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
