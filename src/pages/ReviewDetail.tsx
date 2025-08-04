import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save, AlertTriangle, CheckCircle, ExternalLink, FileText } from 'lucide-react';
import { FILTER_CONFIGS } from '../utils/filterDefinitions';
import { logger } from '../utils/logger';
import CreatableSelect from 'react-select/creatable';

interface LessonMetadata {
  activityType?: string;
  location?: string;
  gradeLevels?: string[];
  themes?: string[];
  season?: string;
  coreCompetencies?: string[];
  socialEmotionalLearning?: string[];
  cookingMethods?: string[];
  mainIngredients?: string[];
  gardenSkills?: string[];
  cookingSkills?: string[];
  culturalHeritage?: string[];
  lessonFormat?: string;
  academicIntegration?: string[];
  observancesHolidays?: string[];
  culturalResponsivenessFeatures?: string[];
  processingNotes?: string;
}

interface SubmissionDetail {
  id: string;
  created_at: string;
  google_doc_url: string;
  google_doc_id: string;
  submission_type: 'new' | 'update';
  original_lesson_id?: string;
  status: string;
  extracted_content: string;
  content_hash: string;
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
    metadata: LessonMetadata;
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
  const [metadata, setMetadata] = useState<LessonMetadata>({});
  const [decision, setDecision] = useState<
    'approve_new' | 'approve_update' | 'reject' | 'needs_revision'
  >('approve_new');
  const [notes, setNotes] = useState('');
  const [selectedDuplicate, setSelectedDuplicate] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

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
    if (!metadata.season) errors.push('Season & Timing');
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
      const firstInvalidField = document.querySelector('[aria-invalid="true"]') as HTMLElement;
      if (firstInvalidField) {
        firstInvalidField.focus();
        firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [validationErrors]);

  const loadSubmission = async () => {
    try {
      // First, get the submission
      const { data: submissionData, error: submissionError } = await supabase
        .from('lesson_submissions')
        .select('*')
        .eq('id', id)
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
        .eq('submission_id', id)
        .order('combined_score', { ascending: false });

      // Get lessons for similarities
      let similaritiesWithLessons = [];
      if (similarities && similarities.length > 0) {
        const lessonIds = similarities.map((s) => s.lesson_id);
        const { data: lessons } = await supabase
          .from('lessons_with_metadata')
          .select('id, title, grade_levels, thematic_categories')
          .in('id', lessonIds);

        if (lessons) {
          similaritiesWithLessons = similarities.map((sim) => {
            const lesson = lessons.find((l) => l.id === sim.lesson_id);
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
        .eq('submission_id', id);

      // Get teacher profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .eq('id', submissionData.teacher_id)
        .single();

      // Combine all data
      const fullSubmission = {
        ...submissionData,
        similarities: similaritiesWithLessons,
        review: reviews || [],
        teacher: {
          email: 'teacher@example.com',
          full_name: profile?.full_name || 'Unknown Teacher',
        },
      };

      setSubmission(fullSubmission);

      // If there's an existing review, load its data
      if (reviews && reviews.length > 0) {
        const review = reviews[0];
        setMetadata(review.tagged_metadata || {});
        setDecision(review.decision);
        setNotes(review.notes || '');
      }
    } catch (error) {
      logger.error('Error loading submission:', error);
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
      const { error: reviewError } = await supabase
        .from('submission_reviews')
        .upsert({
          submission_id: submission.id,
          reviewer_id: (await supabase.auth.getUser()).data.user?.id,
          decision,
          notes,
          tagged_metadata: metadata, // Use the actual column name
          created_at: new Date().toISOString(),
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

        // Create new lesson in the lessons table
        const { error: lessonError } = await supabase.from('lessons_with_metadata').insert({
          lesson_id: `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: lessonData.title || 'Untitled Lesson',
          summary: lessonData.summary || '',
          file_link: submission.google_doc_url,
          grade_levels: metadata.gradeLevels || [],
          activity_type: metadata.activityType ? [metadata.activityType] : [],
          metadata: {
            thematicCategories: metadata.themes || [],
            seasonTiming: metadata.season ? [metadata.season] : [],
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
        });

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
          title: existingLesson.title,
          summary: existingLesson.summary,
          file_link: existingLesson.file_link,
          grade_levels: existingLesson.grade_levels,
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
        const { error: updateLessonError } = await supabase
          .from('lessons_with_metadata')
          .update({
            title: lessonData.title || existingLesson.title,
            summary: lessonData.summary || existingLesson.summary,
            file_link: submission.google_doc_url,
            grade_levels: metadata.gradeLevels || existingLesson.grade_levels,
            activity_type: metadata.activityType
              ? [metadata.activityType]
              : existingLesson.activity_type,
            metadata: {
              thematicCategories: metadata.themes || [],
              seasonTiming: metadata.season ? [metadata.season] : [],
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
      logger.error('Error saving review:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleMetadataChange = useCallback(
    <K extends keyof LessonMetadata>(filterKey: K, value: LessonMetadata[K]) => {
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
      { key: 'season', label: 'Season & Timing', value: metadata.season },
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
        <div className="lg:col-span-2 space-y-6">
          {/* Content Preview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Extracted Content</h2>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-gray-700 text-sm bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                {submission.extracted_content}
              </pre>
            </div>
          </div>

          {/* Duplicate Analysis */}
          {topDuplicates.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="text-yellow-600" size={20} />
                <h2 className="text-lg font-semibold">Potential Duplicates</h2>
              </div>
              <div className="space-y-3">
                {topDuplicates.map((dup) => (
                  <div
                    key={dup.lesson_id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedDuplicate === dup.lesson_id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedDuplicate(dup.lesson_id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{dup.lesson.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Grades: {dup.lesson.grade_levels?.join(', ') || 'Not specified'}
                        </p>
                        <div className="mt-2 flex gap-4 text-sm">
                          <span>Overall: {Math.round(dup.combined_score * 100)}%</span>
                          <span>Title: {Math.round(dup.title_similarity * 100)}%</span>
                          <span>Content: {Math.round(dup.content_similarity * 100)}%</span>
                        </div>
                      </div>
                      {selectedDuplicate === dup.lesson_id && (
                        <CheckCircle className="text-green-600" size={20} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Metadata & Decision */}
        <div className="space-y-6">
          {/* Metadata Tagging */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Lesson Metadata</h2>
              <p className="text-sm text-gray-600 mt-1">Complete all required fields (*) to save</p>

              {/* Progress Indicator */}
              <div className="mt-3">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>
                    Progress: {fieldProgress.completed}/{fieldProgress.total} fields
                  </span>
                  <span>{fieldProgress.percentage}% complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      fieldProgress.percentage === 100
                        ? 'bg-green-600'
                        : fieldProgress.percentage >= 75
                          ? 'bg-blue-600'
                          : fieldProgress.percentage >= 50
                            ? 'bg-yellow-600'
                            : 'bg-red-600'
                    }`}
                    style={{ width: `${fieldProgress.percentage}%` }}
                    role="progressbar"
                    aria-valuenow={fieldProgress.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${fieldProgress.percentage}% of required fields completed`}
                  />
                </div>
              </div>
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div
                className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg"
                role="alert"
                aria-live="polite"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="text-red-600 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Please fill in the following required fields:
                    </p>
                    <ul className="mt-2 text-sm text-red-700 space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Required Fields Section */}
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-900 mb-3 pb-2 border-b border-gray-200">
                Required Fields
              </h3>
              <div className="space-y-4">
                {/* Activity Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Activity Type *
                  </label>
                  <select
                    value={metadata.activityType || ''}
                    onChange={(e) => handleMetadataChange('activityType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    aria-required="true"
                    aria-invalid={validationErrors.includes('Activity Type') ? 'true' : 'false'}
                  >
                    <option value="">Select activity type</option>
                    {FILTER_CONFIGS.activityType.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {metadata.activityType && (
                    <p className="mt-1 text-xs text-gray-500">
                      {metadata.activityType === 'cooking' &&
                        '📚 Showing cooking-related fields only'}
                      {metadata.activityType === 'garden' &&
                        '🌱 Showing garden-related fields only'}
                      {metadata.activityType === 'both' &&
                        '🌱📚 Showing all cooking and garden fields'}
                      {metadata.activityType === 'academic' &&
                        '📖 No cooking or garden fields needed'}
                    </p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                  <select
                    value={metadata.location || ''}
                    onChange={(e) => handleMetadataChange('location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    aria-required="true"
                    aria-invalid={validationErrors.includes('Location') ? 'true' : 'false'}
                  >
                    <option value="">Select location</option>
                    {FILTER_CONFIGS.location.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Grade Levels */}
                <fieldset>
                  <legend className="block text-sm font-medium text-gray-700 mb-1">
                    Grade Levels *
                  </legend>
                  <div
                    className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2"
                    aria-label="Grade level selection"
                  >
                    {FILTER_CONFIGS.gradeLevel.options.map((grade) => (
                      <label key={grade.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={metadata.gradeLevels?.includes(grade.value) || false}
                          onChange={(e) => {
                            const current = metadata.gradeLevels || [];
                            const updated = e.target.checked
                              ? [...current, grade.value]
                              : current.filter((g: string) => g !== grade.value);
                            handleMetadataChange('gradeLevels', updated);
                          }}
                          className="mr-2 text-green-600"
                        />
                        <span className="text-sm">{grade.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {/* Thematic Categories */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thematic Categories *
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                    {FILTER_CONFIGS.theme.options.map((theme) => (
                      <label key={theme.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={metadata.themes?.includes(theme.value) || false}
                          onChange={(e) => {
                            const current = metadata.themes || [];
                            const updated = e.target.checked
                              ? [...current, theme.value]
                              : current.filter((t: string) => t !== theme.value);
                            handleMetadataChange('themes', updated);
                          }}
                          className="mr-2 text-green-600"
                        />
                        <span className="text-sm">{theme.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Season */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Season & Timing *
                  </label>
                  <select
                    value={metadata.season || ''}
                    onChange={(e) => handleMetadataChange('season', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select season</option>
                    {FILTER_CONFIGS.seasonTiming.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Core Competencies */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Core Competencies *
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                    {FILTER_CONFIGS.coreCompetencies.options.map((competency) => (
                      <label key={competency.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={metadata.coreCompetencies?.includes(competency.value) || false}
                          onChange={(e) => {
                            const current = metadata.coreCompetencies || [];
                            const updated = e.target.checked
                              ? [...current, competency.value]
                              : current.filter((c: string) => c !== competency.value);
                            handleMetadataChange('coreCompetencies', updated);
                          }}
                          className="mr-2 text-green-600"
                        />
                        <span className="text-sm">{competency.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Social-Emotional Learning */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Social-Emotional Learning *
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                    {FILTER_CONFIGS.socialEmotionalLearning.options.map((sel) => (
                      <label key={sel.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={metadata.socialEmotionalLearning?.includes(sel.value) || false}
                          onChange={(e) => {
                            const current = metadata.socialEmotionalLearning || [];
                            const updated = e.target.checked
                              ? [...current, sel.value]
                              : current.filter((s: string) => s !== sel.value);
                            handleMetadataChange('socialEmotionalLearning', updated);
                          }}
                          className="mr-2 text-green-600"
                        />
                        <span className="text-sm">{sel.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Cooking Methods - Only show for cooking or both */}
                {showCookingFields() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cooking Methods *
                    </label>
                    <div className="space-y-2 border border-gray-200 rounded-md p-2">
                      {FILTER_CONFIGS.cookingMethods.options.map((method) => (
                        <label key={method.value} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={metadata.cookingMethods?.includes(method.value) || false}
                            onChange={(e) => {
                              const current = metadata.cookingMethods || [];
                              const updated = e.target.checked
                                ? [...current, method.value]
                                : current.filter((m: string) => m !== method.value);
                              handleMetadataChange('cookingMethods', updated);
                            }}
                            className="mr-2 text-green-600"
                          />
                          <span className="text-sm">{method.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Main Ingredients - Only show for cooking or both */}
                {showCookingFields() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Main Ingredients *
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
                      {/* Group ingredients by category */}
                      {['Vegetables', 'Fruits', 'Grains', 'Proteins', 'Dairy', 'Seasonings'].map(
                        (category) => (
                          <div key={category}>
                            <div className="font-medium text-xs text-gray-600 mt-2 mb-1">
                              {category}
                            </div>
                            {FILTER_CONFIGS.mainIngredients.options
                              .filter((ingredient) => ingredient.category === category)
                              .map((ingredient) => (
                                <label key={ingredient.value} className="flex items-center ml-2">
                                  <input
                                    type="checkbox"
                                    checked={
                                      metadata.mainIngredients?.includes(ingredient.value) || false
                                    }
                                    onChange={(e) => {
                                      const current = metadata.mainIngredients || [];
                                      const updated = e.target.checked
                                        ? [...current, ingredient.value]
                                        : current.filter((i: string) => i !== ingredient.value);
                                      handleMetadataChange('mainIngredients', updated);
                                    }}
                                    className="mr-2 text-green-600"
                                  />
                                  <span className="text-sm">{ingredient.label}</span>
                                </label>
                              ))}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Garden Skills - Only show for garden or both */}
                {showGardenFields() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Garden Skills *
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
                      {FILTER_CONFIGS.gardenSkills.options.map((skill) => (
                        <label key={skill.value} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={metadata.gardenSkills?.includes(skill.value) || false}
                            onChange={(e) => {
                              const current = metadata.gardenSkills || [];
                              const updated = e.target.checked
                                ? [...current, skill.value]
                                : current.filter((s: string) => s !== skill.value);
                              handleMetadataChange('gardenSkills', updated);
                            }}
                            className="mr-2 text-green-600"
                          />
                          <span className="text-sm">{skill.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cooking Skills - Only show for cooking or both */}
                {showCookingFields() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cooking Skills *
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
                      {/* Group cooking skills by category */}
                      {['Basic', 'Cutting', 'Cooking', 'Advanced', 'Assembly'].map((category) => (
                        <div key={category}>
                          <div className="font-medium text-xs text-gray-600 mt-2 mb-1">
                            {category}
                          </div>
                          {FILTER_CONFIGS.cookingSkills.options
                            .filter((skill) => skill.category === category)
                            .map((skill) => (
                              <label key={skill.value} className="flex items-center ml-2">
                                <input
                                  type="checkbox"
                                  checked={metadata.cookingSkills?.includes(skill.value) || false}
                                  onChange={(e) => {
                                    const current = metadata.cookingSkills || [];
                                    const updated = e.target.checked
                                      ? [...current, skill.value]
                                      : current.filter((s: string) => s !== skill.value);
                                    handleMetadataChange('cookingSkills', updated);
                                  }}
                                  className="mr-2 text-green-600"
                                />
                                <span className="text-sm">{skill.label}</span>
                              </label>
                            ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Fields Section */}
              <div className="mb-6">
                <h3 className="text-md font-medium text-gray-900 mb-3 pb-2 border-b border-gray-200">
                  Optional Fields
                </h3>
                <div className="space-y-4">
                  {/* Cultural Heritage */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cultural Heritage
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
                      {FILTER_CONFIGS.culturalHeritage.options.map((heritage) => (
                        <div key={heritage.value}>
                          <label className="flex items-center font-medium">
                            <input
                              type="checkbox"
                              checked={metadata.culturalHeritage?.includes(heritage.value) || false}
                              onChange={(e) => {
                                const current = metadata.culturalHeritage || [];
                                let updated: string[];
                                if (e.target.checked) {
                                  updated = [...current, heritage.value];
                                } else {
                                  updated = current.filter((c: string) => {
                                    if (c === heritage.value) return false;
                                    if (heritage.children) {
                                      return !heritage.children.some((child) => child.value === c);
                                    }
                                    return true;
                                  });
                                }
                                handleMetadataChange('culturalHeritage', updated);
                              }}
                              className="mr-2 text-green-600"
                            />
                            <span className="text-sm">{heritage.label}</span>
                          </label>
                          {heritage.children && (
                            <div className="ml-6 mt-1 space-y-1">
                              {heritage.children.map((child) => (
                                <label key={child.value} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={
                                      metadata.culturalHeritage?.includes(child.value) || false
                                    }
                                    onChange={(e) => {
                                      const current = metadata.culturalHeritage || [];
                                      const updated = e.target.checked
                                        ? [...current, child.value]
                                        : current.filter((c: string) => c !== child.value);
                                      handleMetadataChange('culturalHeritage', updated);
                                    }}
                                    className="mr-2 text-green-600"
                                  />
                                  <span className="text-sm text-gray-600">{child.label}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Lesson Format */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lesson Format
                    </label>
                    <select
                      value={metadata.lessonFormat || ''}
                      onChange={(e) => handleMetadataChange('lessonFormat', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Select lesson format</option>
                      {FILTER_CONFIGS.lessonFormat.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Academic Integration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Academic Integration
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                      {FILTER_CONFIGS.academicIntegration.options.map((subject) => (
                        <label key={subject.value} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={metadata.academicIntegration?.includes(subject.value) || false}
                            onChange={(e) => {
                              const current = metadata.academicIntegration || [];
                              const updated = e.target.checked
                                ? [...current, subject.value]
                                : current.filter((s: string) => s !== subject.value);
                              handleMetadataChange('academicIntegration', updated);
                            }}
                            className="mr-2 text-green-600"
                          />
                          <span className="text-sm">{subject.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="mt-6">
                  <h3 className="text-md font-medium text-gray-900 mb-3 pb-2 border-b border-gray-200">
                    Additional Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Observances & Holidays */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observances & Holidays
                      </label>
                      <CreatableSelect
                        isMulti
                        isClearable
                        options={FILTER_CONFIGS.observancesHolidays.options}
                        value={(metadata.observancesHolidays || []).map((v: string) => ({
                          value: v,
                          label: v,
                        }))}
                        onChange={(selected) => {
                          const values = selected ? selected.map((item) => item.value) : [];
                          handleMetadataChange('observancesHolidays', values);
                        }}
                        placeholder="Select or create observances..."
                        className="react-select-container"
                        classNamePrefix="react-select"
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderColor: '#d1d5db',
                            '&:hover': { borderColor: '#9ca3af' },
                            boxShadow: 'none',
                          }),
                          multiValue: (base) => ({
                            ...base,
                            backgroundColor: '#e5e7eb',
                          }),
                        }}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Select from common observances or type to add custom ones
                      </p>
                    </div>

                    {/* Cultural Responsiveness Features */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cultural Responsiveness Features
                      </label>
                      <CreatableSelect
                        isMulti
                        isClearable
                        options={FILTER_CONFIGS.culturalResponsivenessFeatures.options}
                        value={(metadata.culturalResponsivenessFeatures || []).map((v: string) => ({
                          value: v,
                          label: v,
                        }))}
                        onChange={(selected) => {
                          const values = selected ? selected.map((item) => item.value) : [];
                          handleMetadataChange('culturalResponsivenessFeatures', values);
                        }}
                        placeholder="Select or create features..."
                        className="react-select-container"
                        classNamePrefix="react-select"
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderColor: '#d1d5db',
                            '&:hover': { borderColor: '#9ca3af' },
                            boxShadow: 'none',
                          }),
                          multiValue: (base) => ({
                            ...base,
                            backgroundColor: '#e5e7eb',
                          }),
                        }}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Select from standard features or add custom ones
                      </p>
                    </div>

                    {/* Processing Notes */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Processing Notes
                      </label>
                      <textarea
                        placeholder="Any notes about the extraction or processing of this lesson..."
                        value={metadata.processingNotes || ''}
                        onChange={(e) => handleMetadataChange('processingNotes', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Decision */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold mb-4">Review Decision</h2>

                <div className="space-y-3 mb-4">
                  <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="approve_new"
                      checked={decision === 'approve_new'}
                      onChange={(e) => setDecision(e.target.value as any)}
                      className="mt-1 mr-3 text-green-600"
                    />
                    <div>
                      <div className="font-medium">Approve as New Lesson</div>
                      <div className="text-sm text-gray-600">
                        This is a unique lesson to add to the collection
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="approve_update"
                      checked={decision === 'approve_update'}
                      onChange={(e) => setDecision(e.target.value as any)}
                      className="mt-1 mr-3 text-green-600"
                      disabled={!selectedDuplicate}
                    />
                    <div>
                      <div className="font-medium">Approve as Update</div>
                      <div className="text-sm text-gray-600">
                        {selectedDuplicate
                          ? 'Update the selected duplicate lesson'
                          : 'Select a duplicate lesson first'}
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="needs_revision"
                      checked={decision === 'needs_revision'}
                      onChange={(e) => setDecision(e.target.value as any)}
                      className="mt-1 mr-3 text-yellow-600"
                    />
                    <div>
                      <div className="font-medium">Needs Revision</div>
                      <div className="text-sm text-gray-600">Request changes from the teacher</div>
                    </div>
                  </label>

                  <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="reject"
                      checked={decision === 'reject'}
                      onChange={(e) => setDecision(e.target.value as any)}
                      className="mt-1 mr-3 text-red-600"
                    />
                    <div>
                      <div className="font-medium">Reject</div>
                      <div className="text-sm text-gray-600">
                        Do not add this lesson to the collection
                      </div>
                    </div>
                  </label>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Review Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Add notes for the teacher or other reviewers..."
                  />
                </div>

                <button
                  onClick={handleSaveReview}
                  disabled={saving}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Review
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
