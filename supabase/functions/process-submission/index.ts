import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessSubmissionRequest {
  googleDocUrl: string;
  submissionType: 'new' | 'update';
  originalLessonId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create client with user's token for RLS
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Create service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const { googleDocUrl, submissionType, originalLessonId } =
      (await req.json()) as ProcessSubmissionRequest;

    // Extract Google Doc ID
    const docIdMatch = googleDocUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    if (!docIdMatch) {
      throw new Error('Invalid Google Doc URL');
    }
    const googleDocId = docIdMatch[1];

    // Step 1: Create submission record
    const { data: submission, error: submissionError } = await supabaseClient
      .from('lesson_submissions')
      .insert({
        teacher_id: user.id,
        google_doc_url: googleDocUrl,
        google_doc_id: googleDocId,
        submission_type: submissionType,
        original_lesson_id: originalLessonId,
        status: 'submitted',
      })
      .select()
      .single();

    if (submissionError) throw submissionError;

    // Step 2: Extract content from Google Doc (mock for now)
    const extractResponse = await fetch(`${supabaseUrl}/functions/v1/extract-google-doc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ googleDocUrl }),
    });

    const extractResult = await extractResponse.json();
    if (!extractResult.success) {
      throw new Error('Failed to extract content');
    }

    const { title, content } = extractResult.data;

    // Step 3: Update submission with extracted content
    const { error: updateError } = await supabaseAdmin
      .from('lesson_submissions')
      .update({
        extracted_content: content,
      })
      .eq('id', submission.id);

    if (updateError) throw updateError;

    // Step 4: Generate embedding (would use OpenAI in production)
    // For now, we'll skip this step

    // Step 5: Detect duplicates
    const duplicateResponse = await fetch(`${supabaseUrl}/functions/v1/detect-duplicates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        submissionId: submission.id,
        content,
        title,
        metadata: {}, // Would extract from content in production
      }),
    });

    const duplicateResult = await duplicateResponse.json();
    if (!duplicateResult.success) {
      console.error('Duplicate detection failed:', duplicateResult.error);
    }

    // Step 6: Update submission with content hash
    if (duplicateResult.data?.contentHash) {
      await supabaseAdmin
        .from('lesson_submissions')
        .update({
          content_hash: duplicateResult.data.contentHash,
        })
        .eq('id', submission.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          submissionId: submission.id,
          status: submission.status,
          extractedTitle: title,
          duplicatesFound: duplicateResult.data?.duplicatesFound || 0,
          topDuplicates: duplicateResult.data?.duplicates?.slice(0, 3) || [],
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Process submission error:', error);
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
