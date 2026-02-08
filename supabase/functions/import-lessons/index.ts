import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getRestrictedCorsHeaders } from '../_shared/cors.ts';

interface LessonData {
  lessonId: string;
  title: string;
  summary: string;
  fileLink: string;
  gradeLevels: string[];
  metadata: any;
  confidence: any;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getRestrictedCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Use service role for admin operations
    );

    const { lessons }: { lessons: LessonData[] } = await req.json();

    if (!Array.isArray(lessons)) {
      throw new Error('Invalid data format: expected array of lessons');
    }

    console.log(`Importing ${lessons.length} lessons...`);

    // Transform lessons for database insertion
    const lessonsToInsert = lessons.map((lesson) => ({
      lesson_id: lesson.lessonId,
      title: lesson.title,
      summary: lesson.summary,
      file_link: lesson.fileLink,
      grade_levels: lesson.gradeLevels,
      metadata: lesson.metadata,
      confidence: lesson.confidence,
    }));

    // Insert lessons in batches to avoid timeout
    const batchSize = 100;
    const results = [];

    for (let i = 0; i < lessonsToInsert.length; i += batchSize) {
      const batch = lessonsToInsert.slice(i, i + batchSize);

      const { data, error } = await supabaseClient
        .from('lessons')
        .upsert(batch, {
          onConflict: 'lesson_id',
          ignoreDuplicates: false,
        })
        .select('lesson_id');

      if (error) {
        console.error(`Batch ${Math.floor(i / batchSize) + 1} error:`, error);
        throw error;
      }

      results.push(...(data || []));
      console.log(
        `Imported batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(lessonsToInsert.length / batchSize)}`
      );
    }

    console.log(`Successfully imported ${results.length} lessons`);

    return new Response(
      JSON.stringify({
        success: true,
        imported: results.length,
        message: `Successfully imported ${results.length} lessons`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({
        error: 'Import failed',
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
