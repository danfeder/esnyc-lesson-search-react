import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, ExternalLink, FileText } from 'lucide-react';
import { logger } from '@/utils/logger';
import type { ReviewMetadata } from '@/types';
import { FEATURES } from '@/utils/featureFlags';
import type { Json } from '@/types/database.types';
import { ReviewContent } from '@/components/Review/ReviewContent';
import { ReviewDuplicates } from '@/components/Review/ReviewDuplicates';
import { ReviewMetadataForm } from '@/components/Review/ReviewMetadataForm';
import { ReviewActions } from '@/components/Review/ReviewActions';

interface SubmissionDetail {
  id: string;
  created_at: string;
  google_doc_url: string;
  google_doc_id: string;
  submission_type: 'new' | 'update';
  original_lesson_id?: string;
  status: string;
  extracted_content: string;
  extracted_title?: string;
  content_hash: string;
  content_embedding?: string;
  teacher: {
    email: string;
    full_name?: string;
  };
  similarities?: Array<{
    lesson_id: string;
    combined_score: number;
    match_type: string;
    title_similarity: number;
    content_similarity: number;
    lesson: {
      title: string;
      grade_levels: string[];
      thematic_categories: string[];
    };
  }>;
  review?: {
    metadata: ReviewMetadata;
    decision: string;
    notes: string;
  };
}

// Helper function to parse extracted content
function parseExtractedContent(content: string): { title: string; summary: string } {
  // Try to extract title from the first line or header
  const lines = content.split('\n').filter((line) => line.trim());
  let title = '';
  let summary = '';

  // Look for a title pattern (could be the first non-empty line or after "Title:")
  const titleMatch = content.match(/^(Title:|Lesson Title:|#\s+)?(.+)$/im);
  if (titleMatch && titleMatch[2]) {
    title = titleMatch[2].trim();
  } else if (lines.length > 0) {
    // Use first line as title if no specific title pattern found
    title = lines[0].trim();
  }

  // Look for summary pattern
  const summaryMatch = content.match(
    /(?:Summary:|Overview:|Description:)\s*(.+?)(?:\n\n|\n(?=[A-Z]))/is
  );
  if (summaryMatch && summaryMatch[1]) {
    summary = summaryMatch[1].trim();
  } else {
    // Use first paragraph after title as summary
    const contentAfterTitle = lines.slice(1).join('\n');
    const firstParagraph = contentAfterTitle.split(/\n\n/)[0];
    if (firstParagraph) {
      summary = firstParagraph.trim().substring(0, 500); // Limit summary length
    }
  }

  return { title, summary };
}

export function ReviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [metadata, setMetadata] = useState<ReviewMetadata>({});
  const [decision, setDecision] = useState<
    'approve_new' | 'approve_update' | 'reject' | 'needs_revision'
  >('approve_new');
  const [notes, setNotes] = useState('');
  const [selectedDuplicate, setSelectedDuplicate] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<'embed' | 'text'>(() => {
    if (!FEATURES.GOOGLE_DOC_EMBED) return 'text';
    if (typeof window !== 'undefined' && window.localStorage) {
      return (window.localStorage.getItem('reviewViewMode') as 'embed' | 'text') || 'embed';
    }
    return 'embed';
  });

  // Helper functions for conditional field visibility
  const showCookingFields = useCallback(() => {
    return metadata.activityType === 'cooking' || metadata.activityType === 'both';
  }, [metadata.activityType]);

  const showGardenFields = useCallback(() => {
    return metadata.activityType === 'garden' || metadata.activityType === 'both';
  }, [metadata.activityType]);

  // Validation function for required fields
  const validateRequiredFields = () => {
    const errors: string[] = [];

    // Always required fields
    if (!metadata.activityType) errors.push('Activity Type');
    if (!metadata.location) errors.push('Location');
    if (!metadata.gradeLevels?.length) errors.push('Grade Levels');
    if (!metadata.themes?.length) errors.push('Thematic Categories');
    if (!metadata.season?.length) errors.push('Season & Timing');
    if (!metadata.coreCompetencies?.length) errors.push('Core Competencies');
    if (!metadata.socialEmotionalLearning?.length) errors.push('Social-Emotional Learning');

    // Conditionally required fields based on activity type
    if (showCookingFields()) {
      if (!metadata.cookingMethods?.length) errors.push('Cooking Methods');
      if (!metadata.mainIngredients?.length) errors.push('Main Ingredients');
      if (!metadata.cookingSkills?.length) errors.push('Cooking Skills');
    }

    if (showGardenFields()) {
      if (!metadata.gardenSkills?.length) errors.push('Garden Skills');
    }

    return errors;
  };

  useEffect(() => {
    if (id) {
      loadSubmission();
    }
  }, [id]);

  // Focus management for validation errors
  useEffect(() => {
    if (validationErrors.length > 0) {
      // Focus the first field with an error
      const firstInvalidField = document.querySelector('[aria-invalid="true"]');
      if (firstInvalidField && 'focus' in firstInvalidField) {
        (firstInvalidField as any).focus();
        firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [validationErrors]);

  const loadSubmission = async () => {
    try {
      // First, get the submission including embedding
      const { data: submissionData, error: submissionError } = await supabase
        .from('lesson_submissions')
        .select('*, content_embedding')
        .eq('id', id!)
        .single();

      if (submissionError) throw submissionError;
      if (!submissionData) {
        logger.error('No submission found with id:', id);
        setLoading(false);
        return;
      }

      // Get similarities separately
      const { data: similarities } = await supabase
        .from('submission_similarities')
        .select('*')
        .eq('submission_id', id!)
        .order('combined_score', { ascending: false });

      // Get lessons for similarities
      let similaritiesWithLessons: any[] = [];
      if (similarities && similarities.length > 0) {
        const lessonIds = similarities.map((s) => s.lesson_id);
        const { data: lessons, error: lessonsError } = await supabase
          .from('lessons_with_metadata')
          .select('lesson_id, title, grade_levels, thematic_categories')
          .in('lesson_id', lessonIds);

        if (lessonsError) {
          logger.error('Error fetching similar lessons:', lessonsError);
        }

        if (lessons) {
          similaritiesWithLessons = similarities.map((sim) => {
            const lesson = lessons.find((l) => l.lesson_id === sim.lesson_id);
            if (!lesson) {
              logger.debug(`Lesson not found for similarity: ${sim.lesson_id}`);
            }
            return {
              ...sim,
              lesson: lesson || { title: 'Unknown', grade_levels: [], thematic_categories: [] },
            };
          });
        }
      }

      // Get review separately
      const { data: reviews } = await supabase
        .from('submission_reviews')
        .select('*')
        .eq('submission_id', id!);

      // Get teacher profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .eq('id', submissionData.teacher_id)
        .single();

      // Combine all data
      const fullSubmission: SubmissionDetail = {
        ...submissionData,
        created_at: submissionData.created_at || '',
        status: submissionData.status || 'pending',
        extracted_content: submissionData.extracted_content || '',
        content_hash: submissionData.content_hash || '',
        submission_type: (submissionData.submission_type || 'new') as 'new' | 'update',
        original_lesson_id: submissionData.original_lesson_id || undefined,
        content_embedding: submissionData.content_embedding || undefined,
        similarities: similaritiesWithLessons,
        review: reviews?.[0]
          ? {
              metadata: (reviews[0].tagged_metadata as ReviewMetadata) || {},
              decision: reviews[0].decision || '',
              notes: reviews[0].notes || '',
            }
          : undefined,
        teacher: {
          email: 'teacher@example.com',
          full_name: profile?.full_name || 'Unknown Teacher',
        },
      };

      setSubmission(fullSubmission);

      // If there's an existing review, load its data
      if (reviews && reviews.length > 0) {
        const review = reviews[0];
        setMetadata((review.tagged_metadata as ReviewMetadata) || {});
        setDecision(
          review.decision as 'approve_new' | 'approve_update' | 'reject' | 'needs_revision'
        );
        setNotes(review.notes || '');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error loading submission:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReview = async () => {
    if (!submission) return;

    // Validate required fields
    const errors = validateRequiredFields();
    if (errors.length > 0) {
      setValidationErrors(errors);
      // Scroll to the error message at the top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setValidationErrors([]);

    setSaving(true);
    try {
      // Create or update review
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (!currentUser) throw new Error('Not authenticated');

      const { error: reviewError } = await supabase
        .from('submission_reviews')
        .insert({
          submission_id: submission.id,
          reviewer_id: currentUser.id,
          decision,
          notes,
          tagged_metadata: metadata as Json, // Cast to Json type
        })
        .select()
        .single();

      if (reviewError) throw reviewError;

      // Update submission status based on decision
      let newStatus = 'under_review';
      if (decision === 'approve_new' || decision === 'approve_update') {
        newStatus = 'approved';
      } else if (decision === 'reject') {
        newStatus = 'rejected';
      } else if (decision === 'needs_revision') {
        newStatus = 'needs_revision';
      }

      const { error: updateError } = await supabase
        .from('lesson_submissions')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', submission.id);

      if (updateError) throw updateError;

      // If approved as new, create the lesson
      if (decision === 'approve_new') {
        // Parse the extracted content to get lesson details
        const lessonData = parseExtractedContent(submission.extracted_content);
        const baseTitle = submission.extracted_title || lessonData.title;

        // Create new lesson (write to base table to set all native columns)
        const newLesson: any = {
          lesson_id: `lesson_${crypto.randomUUID()}`,
          title: baseTitle || 'Untitled Lesson',
          summary: lessonData.summary || '',
          file_link: submission.google_doc_url,
          grade_levels: metadata.gradeLevels || [],
          // Base array columns (ensure arrays)
          activity_type: metadata.activityType ? [metadata.activityType] : [],
          thematic_categories: metadata.themes || [],
          season_timing: metadata.season || [],
          core_competencies: metadata.coreCompetencies || [],
          cultural_heritage: metadata.culturalHeritage || [],
          location_requirements: metadata.location ? [metadata.location] : [],
          lesson_format: metadata.lessonFormat || null,
          academic_integration: metadata.academicIntegration || [],
          social_emotional_learning: metadata.socialEmotionalLearning || [],
          cooking_methods: metadata.cookingMethods || [],
          main_ingredients: metadata.mainIngredients || [],
          garden_skills: metadata.gardenSkills || [],
          cooking_skills: metadata.cookingSkills || [],
          observances_holidays: metadata.observancesHolidays || [],
          cultural_responsiveness_features: metadata.culturalResponsivenessFeatures || [],
          // Keep metadata JSON as well for compatibility
          metadata: {
            thematicCategories: metadata.themes || [],
            seasonTiming: metadata.season || [],
            coreCompetencies: metadata.coreCompetencies || [],
            culturalHeritage: metadata.culturalHeritage || [],
            locationRequirements: metadata.location ? [metadata.location] : [],
            lessonFormat: metadata.lessonFormat ? [metadata.lessonFormat] : [],
            academicIntegration: metadata.academicIntegration || [],
            socialEmotionalLearning: metadata.socialEmotionalLearning || [],
            cookingMethods: metadata.cookingMethods || [],
            mainIngredients: metadata.mainIngredients || [],
            gardenSkills: metadata.gardenSkills || [],
            cookingSkills: metadata.cookingSkills || [],
            observancesHolidays: metadata.observancesHolidays || [],
            culturalResponsivenessFeatures: metadata.culturalResponsivenessFeatures || [],
          },
          content_text: submission.extracted_content,
          content_hash: submission.content_hash,
          original_submission_id: submission.id,
          processing_notes: metadata.processingNotes || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Include embedding if available and valid
        if (submission.content_embedding && typeof submission.content_embedding === 'string') {
          try {
            // Validate it's a proper embedding array
            const parsed = JSON.parse(submission.content_embedding);
            if (Array.isArray(parsed) && parsed.length > 0) {
              newLesson.content_embedding = submission.content_embedding;
              logger.debug(
                'Including valid embedding in new lesson from submission:',
                submission.id
              );
            } else {
              logger.warn('Invalid embedding format for submission:', submission.id);
            }
          } catch (error) {
            logger.warn('Failed to validate embedding for submission:', submission.id, error);
          }
        } else {
          logger.debug('No embedding available for submission:', submission.id);
        }

        const { error: lessonError } = await supabase.from('lessons').insert(newLesson);

        if (lessonError) throw lessonError;
      } else if (decision === 'approve_update' && selectedDuplicate) {
        // Get the existing lesson to preserve some fields
        const { data: existingLesson, error: fetchError } = await supabase
          .from('lessons_with_metadata')
          .select('*')
          .eq('lesson_id', selectedDuplicate)
          .single();

        if (fetchError) throw fetchError;

        // Archive the current version before updating
        const { error: archiveError } = await supabase.from('lesson_versions').insert({
          lesson_id: selectedDuplicate,
          version_number: existingLesson.version_number || 1,
          title: existingLesson.title || '',
          summary: existingLesson.summary || '',
          file_link: existingLesson.file_link || '',
          grade_levels: existingLesson.grade_levels || [],
          metadata: existingLesson.metadata,
          content_text: existingLesson.content_text,
          archived_from_submission_id: submission.id,
          archived_by: (await supabase.auth.getUser()).data.user?.id,
          archive_reason: 'Content update from new submission',
        });

        if (archiveError) throw archiveError;

        // Parse the new content
        const lessonData = parseExtractedContent(submission.extracted_content);

        // Update the existing lesson
        // Safely derive existing activityType from metadata JSON when view lacks base column
        const existingActivityType =
          existingLesson.metadata &&
          typeof existingLesson.metadata === 'object' &&
          !Array.isArray(existingLesson.metadata) &&
          'activityType' in (existingLesson.metadata as Record<string, any>)
            ? (existingLesson.metadata as any).activityType
            : undefined;

        const updateData: any = {
          title: lessonData.title || existingLesson.title,
          summary: lessonData.summary || existingLesson.summary,
          file_link: submission.google_doc_url,
          grade_levels: metadata.gradeLevels || existingLesson.grade_levels || [],
          activity_type: metadata.activityType
            ? [metadata.activityType]
            : Array.isArray(existingActivityType)
              ? existingActivityType
              : existingActivityType
                ? [existingActivityType]
                : [],
          thematic_categories: metadata.themes || existingLesson.thematic_categories || [],
          season_timing: metadata.season || existingLesson.season_timing || [],
          core_competencies: metadata.coreCompetencies || existingLesson.core_competencies || [],
          cultural_heritage: metadata.culturalHeritage || existingLesson.cultural_heritage || [],
          location_requirements:
            (metadata.location ? [metadata.location] : null) ||
            existingLesson.location_requirements ||
            [],
          lesson_format: metadata.lessonFormat || existingLesson.lesson_format || null,
          academic_integration:
            metadata.academicIntegration || existingLesson.academic_integration || [],
          social_emotional_learning:
            metadata.socialEmotionalLearning || existingLesson.social_emotional_learning || [],
          cooking_methods: metadata.cookingMethods || existingLesson.cooking_methods || [],
          main_ingredients: metadata.mainIngredients || existingLesson.main_ingredients || [],
          garden_skills: metadata.gardenSkills || existingLesson.garden_skills || [],
          cooking_skills: metadata.cookingSkills || existingLesson.cooking_skills || [],
          observances_holidays:
            metadata.observancesHolidays || existingLesson.observances_holidays || [],
          cultural_responsiveness_features:
            metadata.culturalResponsivenessFeatures ||
            existingLesson.cultural_responsiveness_features ||
            [],
        };

        // Only set activity_type_meta if we have a value
        if (metadata.activityType || existingLesson.activity_type_meta) {
          updateData.activity_type_meta =
            metadata.activityType || existingLesson.activity_type_meta;
        }

        const { error: updateLessonError } = await supabase
          .from('lessons')
          .update({
            ...updateData,
            metadata: {
              thematicCategories: metadata.themes || [],
              seasonTiming: metadata.season || [],
              coreCompetencies: metadata.coreCompetencies || [],
              culturalHeritage: metadata.culturalHeritage || [],
              locationRequirements: metadata.location ? [metadata.location] : [],
              lessonFormat: metadata.lessonFormat ? [metadata.lessonFormat] : [],
              academicIntegration: metadata.academicIntegration || [],
              socialEmotionalLearning: metadata.socialEmotionalLearning || [],
              cookingMethods: metadata.cookingMethods || [],
              mainIngredients: metadata.mainIngredients || [],
              gardenSkills: metadata.gardenSkills || [],
              cookingSkills: metadata.cookingSkills || [],
              observancesHolidays: metadata.observancesHolidays || [],
              culturalResponsivenessFeatures: metadata.culturalResponsivenessFeatures || [],
            },
            content_text: submission.extracted_content,
            content_hash: submission.content_hash,
            version_number: (existingLesson.version_number || 1) + 1,
            has_versions: true,
            processing_notes: metadata.processingNotes || '',
            updated_at: new Date().toISOString(),
          })
          .eq('lesson_id', selectedDuplicate);

        if (updateLessonError) throw updateLessonError;
      }

      navigate('/review');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error saving review:', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleMetadataChange = useCallback(
    <K extends keyof ReviewMetadata>(filterKey: K, value: ReviewMetadata[K]) => {
      setMetadata((prev) => ({
        ...prev,
        [filterKey]: value,
      }));
    },
    []
  );

  const topDuplicates = useMemo(
    () =>
      submission?.similarities?.sort((a, b) => b.combined_score - a.combined_score).slice(0, 5) ||
      [],
    [submission?.similarities]
  );

  // Calculate progress for required fields
  const fieldProgress = useMemo(() => {
    const requiredFields = [
      { key: 'activityType', label: 'Activity Type', value: metadata.activityType },
      { key: 'location', label: 'Location', value: metadata.location },
      { key: 'gradeLevels', label: 'Grade Levels', value: (metadata.gradeLevels?.length ?? 0) > 0 },
      { key: 'themes', label: 'Thematic Categories', value: (metadata.themes?.length ?? 0) > 0 },
      { key: 'season', label: 'Season & Timing', value: (metadata.season?.length ?? 0) > 0 },
      {
        key: 'coreCompetencies',
        label: 'Core Competencies',
        value: (metadata.coreCompetencies?.length ?? 0) > 0,
      },
      {
        key: 'socialEmotionalLearning',
        label: 'Social-Emotional Learning',
        value: (metadata.socialEmotionalLearning?.length ?? 0) > 0,
      },
    ];

    // Add conditional fields
    if (showCookingFields()) {
      requiredFields.push(
        {
          key: 'cookingMethods',
          label: 'Cooking Methods',
          value: (metadata.cookingMethods?.length ?? 0) > 0,
        },
        {
          key: 'mainIngredients',
          label: 'Main Ingredients',
          value: (metadata.mainIngredients?.length ?? 0) > 0,
        },
        {
          key: 'cookingSkills',
          label: 'Cooking Skills',
          value: (metadata.cookingSkills?.length ?? 0) > 0,
        }
      );
    }
    if (showGardenFields()) {
      requiredFields.push({
        key: 'gardenSkills',
        label: 'Garden Skills',
        value: (metadata.gardenSkills?.length ?? 0) > 0,
      });
    }

    const completed = requiredFields.filter((field) => field.value).length;
    const total = requiredFields.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  }, [metadata, showCookingFields, showGardenFields]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading submission...</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Submission not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/review')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Review Submission</h1>
            <p className="text-gray-600">
              Submitted by {submission.teacher.full_name || submission.teacher.email} on{' '}
              {new Date(submission.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <a
          href={submission.google_doc_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FileText size={18} />
          View Google Doc
          <ExternalLink size={16} />
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Content & Duplicates */}
        <section
          className="lg:col-span-2 space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto"
          aria-label="Submission content and duplicates"
          tabIndex={0}
        >
          <ReviewContent
            submission={{
              google_doc_id: submission.google_doc_id,
              google_doc_url: submission.google_doc_url,
              extracted_content: submission.extracted_content,
            }}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />

          <ReviewDuplicates
            duplicates={topDuplicates}
            selectedDuplicate={selectedDuplicate}
            onSelectDuplicate={setSelectedDuplicate}
          />
        </section>

        {/* Right Column - Metadata & Decision */}
        <div className="space-y-6">
          <ReviewMetadataForm
            metadata={metadata}
            onChange={handleMetadataChange}
            validationErrors={validationErrors}
            fieldProgress={fieldProgress}
          />

          <ReviewActions
            decision={decision}
            setDecision={setDecision}
            notes={notes}
            setNotes={setNotes}
            onSave={handleSaveReview}
            saving={saving}
            validationErrors={validationErrors}
            hasSelectedDuplicate={!!selectedDuplicate}
          />
        </div>
      </div>
    </div>
  );
}
