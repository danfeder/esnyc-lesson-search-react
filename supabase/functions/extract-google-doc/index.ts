import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractRequest {
  googleDocUrl: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      // TODO: Implement real Google Docs API extraction
      // For now, continue with enhanced mock
    }

    // Enhanced mock that simulates real lesson content
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
