export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '12.2.3 (519615d)';
  };
  public: {
    Tables: {
      bookmarks: {
        Row: {
          created_at: string | null;
          id: string;
          lesson_id: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          lesson_id: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          lesson_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'bookmarks_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['lesson_id'];
          },
          {
            foreignKeyName: 'bookmarks_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons_with_metadata';
            referencedColumns: ['lesson_id'];
          },
        ];
      };
      canonical_lessons: {
        Row: {
          canonical_id: string;
          duplicate_id: string;
          resolution_notes: string | null;
          resolution_type: string;
          resolved_at: string | null;
          resolved_by: string | null;
          similarity_score: number;
        };
        Insert: {
          canonical_id: string;
          duplicate_id: string;
          resolution_notes?: string | null;
          resolution_type: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          similarity_score: number;
        };
        Update: {
          canonical_id?: string;
          duplicate_id?: string;
          resolution_notes?: string | null;
          resolution_type?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          similarity_score?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'canonical_lessons_canonical_id_fkey';
            columns: ['canonical_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['lesson_id'];
          },
          {
            foreignKeyName: 'canonical_lessons_canonical_id_fkey';
            columns: ['canonical_id'];
            isOneToOne: false;
            referencedRelation: 'lessons_with_metadata';
            referencedColumns: ['lesson_id'];
          },
          {
            foreignKeyName: 'canonical_lessons_duplicate_id_fkey';
            columns: ['duplicate_id'];
            isOneToOne: true;
            referencedRelation: 'lessons';
            referencedColumns: ['lesson_id'];
          },
          {
            foreignKeyName: 'canonical_lessons_duplicate_id_fkey';
            columns: ['duplicate_id'];
            isOneToOne: true;
            referencedRelation: 'lessons_with_metadata';
            referencedColumns: ['lesson_id'];
          },
        ];
      };
      cultural_heritage_hierarchy: {
        Row: {
          children: string[];
          id: number;
          parent: string;
        };
        Insert: {
          children: string[];
          id?: number;
          parent: string;
        };
        Update: {
          children?: string[];
          id?: number;
          parent?: string;
        };
        Relationships: [];
      };
      duplicate_resolutions: {
        Row: {
          action_taken: string;
          canonical_lesson_id: string;
          duplicate_type: string;
          group_id: string;
          id: string;
          lessons_in_group: number;
          metadata_merged: Json | null;
          notes: string | null;
          parent_group_id: string | null;
          resolution_mode: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          similarity_score: number;
          sub_group_name: string | null;
        };
        Insert: {
          action_taken: string;
          canonical_lesson_id: string;
          duplicate_type: string;
          group_id: string;
          id?: string;
          lessons_in_group: number;
          metadata_merged?: Json | null;
          notes?: string | null;
          parent_group_id?: string | null;
          resolution_mode?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          similarity_score: number;
          sub_group_name?: string | null;
        };
        Update: {
          action_taken?: string;
          canonical_lesson_id?: string;
          duplicate_type?: string;
          group_id?: string;
          id?: string;
          lessons_in_group?: number;
          metadata_merged?: Json | null;
          notes?: string | null;
          parent_group_id?: string | null;
          resolution_mode?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          similarity_score?: number;
          sub_group_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'duplicate_resolutions_canonical_lesson_id_fkey';
            columns: ['canonical_lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['lesson_id'];
          },
          {
            foreignKeyName: 'duplicate_resolutions_canonical_lesson_id_fkey';
            columns: ['canonical_lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons_with_metadata';
            referencedColumns: ['lesson_id'];
          },
        ];
      };
      lesson_archive: {
        Row: {
          academic_integration: string[] | null;
          activity_type: string | null;
          archive_reason: string;
          archived_at: string;
          archived_by: string | null;
          archived_by_system: string | null;
          canonical_id: string | null;
          confidence: Json;
          content_embedding: string | null;
          content_hash: string | null;
          content_text: string | null;
          cooking_methods: string[] | null;
          cooking_skills: string[] | null;
          core_competencies: string[] | null;
          created_at: string;
          cultural_heritage: string[] | null;
          cultural_responsiveness_features: string[] | null;
          file_link: string;
          flagged_for_review: boolean | null;
          garden_skills: string[] | null;
          grade_levels: string[];
          has_versions: boolean | null;
          id: string;
          last_modified: string | null;
          lesson_format: string | null;
          lesson_id: string;
          location_requirements: string[] | null;
          main_ingredients: string[] | null;
          metadata: Json;
          observances_holidays: string[] | null;
          original_submission_id: string | null;
          processing_notes: string | null;
          review_notes: string | null;
          search_vector: unknown | null;
          season_timing: string[] | null;
          social_emotional_learning: string[] | null;
          summary: string;
          tags: string[] | null;
          thematic_categories: string[] | null;
          title: string;
          updated_at: string | null;
          version_number: number | null;
        };
        Insert: {
          academic_integration?: string[] | null;
          activity_type?: string | null;
          archive_reason: string;
          archived_at?: string;
          archived_by?: string | null;
          archived_by_system?: string | null;
          canonical_id?: string | null;
          confidence?: Json;
          content_embedding?: string | null;
          content_hash?: string | null;
          content_text?: string | null;
          cooking_methods?: string[] | null;
          cooking_skills?: string[] | null;
          core_competencies?: string[] | null;
          created_at: string;
          cultural_heritage?: string[] | null;
          cultural_responsiveness_features?: string[] | null;
          file_link: string;
          flagged_for_review?: boolean | null;
          garden_skills?: string[] | null;
          grade_levels?: string[];
          has_versions?: boolean | null;
          id: string;
          last_modified?: string | null;
          lesson_format?: string | null;
          lesson_id: string;
          location_requirements?: string[] | null;
          main_ingredients?: string[] | null;
          metadata?: Json;
          observances_holidays?: string[] | null;
          original_submission_id?: string | null;
          processing_notes?: string | null;
          review_notes?: string | null;
          search_vector?: unknown | null;
          season_timing?: string[] | null;
          social_emotional_learning?: string[] | null;
          summary: string;
          tags?: string[] | null;
          thematic_categories?: string[] | null;
          title: string;
          updated_at?: string | null;
          version_number?: number | null;
        };
        Update: {
          academic_integration?: string[] | null;
          activity_type?: string | null;
          archive_reason?: string;
          archived_at?: string;
          archived_by?: string | null;
          archived_by_system?: string | null;
          canonical_id?: string | null;
          confidence?: Json;
          content_embedding?: string | null;
          content_hash?: string | null;
          content_text?: string | null;
          cooking_methods?: string[] | null;
          cooking_skills?: string[] | null;
          core_competencies?: string[] | null;
          created_at?: string;
          cultural_heritage?: string[] | null;
          cultural_responsiveness_features?: string[] | null;
          file_link?: string;
          flagged_for_review?: boolean | null;
          garden_skills?: string[] | null;
          grade_levels?: string[];
          has_versions?: boolean | null;
          id?: string;
          last_modified?: string | null;
          lesson_format?: string | null;
          lesson_id?: string;
          location_requirements?: string[] | null;
          main_ingredients?: string[] | null;
          metadata?: Json;
          observances_holidays?: string[] | null;
          original_submission_id?: string | null;
          processing_notes?: string | null;
          review_notes?: string | null;
          search_vector?: unknown | null;
          season_timing?: string[] | null;
          social_emotional_learning?: string[] | null;
          summary?: string;
          tags?: string[] | null;
          thematic_categories?: string[] | null;
          title?: string;
          updated_at?: string | null;
          version_number?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_archive_canonical_id_fkey';
            columns: ['canonical_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['lesson_id'];
          },
          {
            foreignKeyName: 'lesson_archive_canonical_id_fkey';
            columns: ['canonical_id'];
            isOneToOne: false;
            referencedRelation: 'lessons_with_metadata';
            referencedColumns: ['lesson_id'];
          },
        ];
      };
      lesson_collections: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          is_public: boolean | null;
          lesson_ids: string[] | null;
          name: string;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_public?: boolean | null;
          lesson_ids?: string[] | null;
          name: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_public?: boolean | null;
          lesson_ids?: string[] | null;
          name?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      lesson_submissions: {
        Row: {
          content_embedding: string | null;
          content_hash: string | null;
          created_at: string | null;
          extracted_content: string | null;
          google_doc_id: string;
          google_doc_url: string;
          id: string;
          original_lesson_id: string | null;
          review_completed_at: string | null;
          review_started_at: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reviewer_id: string | null;
          reviewer_notes: string | null;
          revision_requested_reason: string | null;
          status: string;
          submission_type: string;
          teacher_id: string;
          updated_at: string | null;
        };
        Insert: {
          content_embedding?: string | null;
          content_hash?: string | null;
          created_at?: string | null;
          extracted_content?: string | null;
          google_doc_id: string;
          google_doc_url: string;
          id?: string;
          original_lesson_id?: string | null;
          review_completed_at?: string | null;
          review_started_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reviewer_id?: string | null;
          reviewer_notes?: string | null;
          revision_requested_reason?: string | null;
          status?: string;
          submission_type?: string;
          teacher_id: string;
          updated_at?: string | null;
        };
        Update: {
          content_embedding?: string | null;
          content_hash?: string | null;
          created_at?: string | null;
          extracted_content?: string | null;
          google_doc_id?: string;
          google_doc_url?: string;
          id?: string;
          original_lesson_id?: string | null;
          review_completed_at?: string | null;
          review_started_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reviewer_id?: string | null;
          reviewer_notes?: string | null;
          revision_requested_reason?: string | null;
          status?: string;
          submission_type?: string;
          teacher_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_submissions_original_lesson_id_fkey';
            columns: ['original_lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['lesson_id'];
          },
          {
            foreignKeyName: 'lesson_submissions_original_lesson_id_fkey';
            columns: ['original_lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons_with_metadata';
            referencedColumns: ['lesson_id'];
          },
        ];
      };
      lesson_versions: {
        Row: {
          archive_reason: string | null;
          archived_at: string | null;
          archived_by: string | null;
          archived_from_submission_id: string | null;
          content_text: string | null;
          file_link: string;
          grade_levels: string[];
          id: string;
          lesson_id: string;
          metadata: Json;
          summary: string;
          title: string;
          version_number: number;
        };
        Insert: {
          archive_reason?: string | null;
          archived_at?: string | null;
          archived_by?: string | null;
          archived_from_submission_id?: string | null;
          content_text?: string | null;
          file_link: string;
          grade_levels: string[];
          id?: string;
          lesson_id: string;
          metadata: Json;
          summary: string;
          title: string;
          version_number: number;
        };
        Update: {
          archive_reason?: string | null;
          archived_at?: string | null;
          archived_by?: string | null;
          archived_from_submission_id?: string | null;
          content_text?: string | null;
          file_link?: string;
          grade_levels?: string[];
          id?: string;
          lesson_id?: string;
          metadata?: Json;
          summary?: string;
          title?: string;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_versions_archived_from_submission_id_fkey';
            columns: ['archived_from_submission_id'];
            isOneToOne: false;
            referencedRelation: 'lesson_submissions';
            referencedColumns: ['id'];
          },
        ];
      };
      lessons: {
        Row: {
          academic_integration: string[] | null;
          activity_type: string[] | null;
          canonical_id: string | null;
          confidence: Json;
          content_embedding: string | null;
          content_hash: string | null;
          content_text: string | null;
          cooking_methods: string[] | null;
          cooking_skills: string[] | null;
          core_competencies: string[] | null;
          created_at: string | null;
          cultural_heritage: string[] | null;
          cultural_responsiveness_features: string[] | null;
          file_link: string;
          flagged_for_review: boolean | null;
          garden_skills: string[] | null;
          grade_levels: string[];
          has_versions: boolean | null;
          id: string;
          last_modified: string | null;
          lesson_format: string | null;
          lesson_id: string;
          location_requirements: string[] | null;
          main_ingredients: string[] | null;
          metadata: Json;
          observances_holidays: string[] | null;
          original_submission_id: string | null;
          processing_notes: string | null;
          review_notes: string | null;
          search_vector: unknown | null;
          season_timing: string[] | null;
          season_timing_backup: string[] | null;
          social_emotional_learning: string[] | null;
          summary: string;
          tags: string[] | null;
          thematic_categories: string[] | null;
          title: string;
          updated_at: string | null;
          version_number: number | null;
        };
        Insert: {
          academic_integration?: string[] | null;
          activity_type?: string[] | null;
          canonical_id?: string | null;
          confidence?: Json;
          content_embedding?: string | null;
          content_hash?: string | null;
          content_text?: string | null;
          cooking_methods?: string[] | null;
          cooking_skills?: string[] | null;
          core_competencies?: string[] | null;
          created_at?: string | null;
          cultural_heritage?: string[] | null;
          cultural_responsiveness_features?: string[] | null;
          file_link: string;
          flagged_for_review?: boolean | null;
          garden_skills?: string[] | null;
          grade_levels?: string[];
          has_versions?: boolean | null;
          id?: string;
          last_modified?: string | null;
          lesson_format?: string | null;
          lesson_id: string;
          location_requirements?: string[] | null;
          main_ingredients?: string[] | null;
          metadata?: Json;
          observances_holidays?: string[] | null;
          original_submission_id?: string | null;
          processing_notes?: string | null;
          review_notes?: string | null;
          search_vector?: unknown | null;
          season_timing?: string[] | null;
          season_timing_backup?: string[] | null;
          social_emotional_learning?: string[] | null;
          summary: string;
          tags?: string[] | null;
          thematic_categories?: string[] | null;
          title: string;
          updated_at?: string | null;
          version_number?: number | null;
        };
        Update: {
          academic_integration?: string[] | null;
          activity_type?: string[] | null;
          canonical_id?: string | null;
          confidence?: Json;
          content_embedding?: string | null;
          content_hash?: string | null;
          content_text?: string | null;
          cooking_methods?: string[] | null;
          cooking_skills?: string[] | null;
          core_competencies?: string[] | null;
          created_at?: string | null;
          cultural_heritage?: string[] | null;
          cultural_responsiveness_features?: string[] | null;
          file_link?: string;
          flagged_for_review?: boolean | null;
          garden_skills?: string[] | null;
          grade_levels?: string[];
          has_versions?: boolean | null;
          id?: string;
          last_modified?: string | null;
          lesson_format?: string | null;
          lesson_id?: string;
          location_requirements?: string[] | null;
          main_ingredients?: string[] | null;
          metadata?: Json;
          observances_holidays?: string[] | null;
          original_submission_id?: string | null;
          processing_notes?: string | null;
          review_notes?: string | null;
          search_vector?: unknown | null;
          season_timing?: string[] | null;
          season_timing_backup?: string[] | null;
          social_emotional_learning?: string[] | null;
          summary?: string;
          tags?: string[] | null;
          thematic_categories?: string[] | null;
          title?: string;
          updated_at?: string | null;
          version_number?: number | null;
        };
        Relationships: [];
      };
      saved_searches: {
        Row: {
          created_at: string | null;
          filters: Json;
          id: string;
          name: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          filters?: Json;
          id?: string;
          name: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          filters?: Json;
          id?: string;
          name?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      schools: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      search_synonyms: {
        Row: {
          id: number;
          synonym_type: string | null;
          synonyms: string[];
          term: string;
        };
        Insert: {
          id?: number;
          synonym_type?: string | null;
          synonyms: string[];
          term: string;
        };
        Update: {
          id?: number;
          synonym_type?: string | null;
          synonyms?: string[];
          term?: string;
        };
        Relationships: [];
      };
      submission_reviews: {
        Row: {
          canonical_lesson_id: string | null;
          created_at: string | null;
          decision: string | null;
          detected_duplicates: Json | null;
          id: string;
          notes: string | null;
          review_completed_at: string | null;
          review_started_at: string | null;
          reviewer_id: string;
          submission_id: string;
          tagged_metadata: Json;
          time_spent_seconds: number | null;
        };
        Insert: {
          canonical_lesson_id?: string | null;
          created_at?: string | null;
          decision?: string | null;
          detected_duplicates?: Json | null;
          id?: string;
          notes?: string | null;
          review_completed_at?: string | null;
          review_started_at?: string | null;
          reviewer_id: string;
          submission_id: string;
          tagged_metadata?: Json;
          time_spent_seconds?: number | null;
        };
        Update: {
          canonical_lesson_id?: string | null;
          created_at?: string | null;
          decision?: string | null;
          detected_duplicates?: Json | null;
          id?: string;
          notes?: string | null;
          review_completed_at?: string | null;
          review_started_at?: string | null;
          reviewer_id?: string;
          submission_id?: string;
          tagged_metadata?: Json;
          time_spent_seconds?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'submission_reviews_submission_id_fkey';
            columns: ['submission_id'];
            isOneToOne: false;
            referencedRelation: 'lesson_submissions';
            referencedColumns: ['id'];
          },
        ];
      };
      submission_similarities: {
        Row: {
          combined_score: number | null;
          content_similarity: number | null;
          created_at: string | null;
          id: string;
          lesson_id: string;
          match_details: Json | null;
          match_type: string | null;
          metadata_overlap_score: number | null;
          submission_id: string;
          title_similarity: number | null;
        };
        Insert: {
          combined_score?: number | null;
          content_similarity?: number | null;
          created_at?: string | null;
          id?: string;
          lesson_id: string;
          match_details?: Json | null;
          match_type?: string | null;
          metadata_overlap_score?: number | null;
          submission_id: string;
          title_similarity?: number | null;
        };
        Update: {
          combined_score?: number | null;
          content_similarity?: number | null;
          created_at?: string | null;
          id?: string;
          lesson_id?: string;
          match_details?: Json | null;
          match_type?: string | null;
          metadata_overlap_score?: number | null;
          submission_id?: string;
          title_similarity?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'submission_similarities_submission_id_fkey';
            columns: ['submission_id'];
            isOneToOne: false;
            referencedRelation: 'lesson_submissions';
            referencedColumns: ['id'];
          },
        ];
      };
      user_invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_at: string;
          invited_by: string;
          message: string | null;
          metadata: Json | null;
          role: string;
          school_borough: string | null;
          school_name: string | null;
          token: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_at?: string;
          invited_by: string;
          message?: string | null;
          metadata?: Json | null;
          role: string;
          school_borough?: string | null;
          school_name?: string | null;
          token?: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_at?: string;
          invited_by?: string;
          message?: string | null;
          metadata?: Json | null;
          role?: string;
          school_borough?: string | null;
          school_name?: string | null;
          token?: string;
        };
        Relationships: [];
      };
      user_management_audit: {
        Row: {
          action: string;
          actor_id: string;
          created_at: string;
          id: string;
          ip_address: unknown | null;
          metadata: Json | null;
          new_values: Json | null;
          old_values: Json | null;
          target_email: string | null;
          target_user_id: string | null;
          user_agent: string | null;
        };
        Insert: {
          action: string;
          actor_id: string;
          created_at?: string;
          id?: string;
          ip_address?: unknown | null;
          metadata?: Json | null;
          new_values?: Json | null;
          old_values?: Json | null;
          target_email?: string | null;
          target_user_id?: string | null;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string;
          created_at?: string;
          id?: string;
          ip_address?: unknown | null;
          metadata?: Json | null;
          new_values?: Json | null;
          old_values?: Json | null;
          target_email?: string | null;
          target_user_id?: string | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'user_management_audit_target_user_id_fkey';
            columns: ['target_user_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_management_audit_target_user_id_fkey';
            columns: ['target_user_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles_safe';
            referencedColumns: ['id'];
          },
        ];
      };
      user_profiles: {
        Row: {
          accepted_at: string | null;
          created_at: string | null;
          email: string | null;
          full_name: string;
          grades_taught: string[] | null;
          id: string;
          invited_at: string | null;
          invited_by: string | null;
          is_active: boolean | null;
          notes: string | null;
          permissions: Json | null;
          role: string | null;
          school: string | null;
          school_borough: string | null;
          school_name: string | null;
          subjects: string[] | null;
          subjects_taught: string[] | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string | null;
          email?: string | null;
          full_name: string;
          grades_taught?: string[] | null;
          id?: string;
          invited_at?: string | null;
          invited_by?: string | null;
          is_active?: boolean | null;
          notes?: string | null;
          permissions?: Json | null;
          role?: string | null;
          school?: string | null;
          school_borough?: string | null;
          school_name?: string | null;
          subjects?: string[] | null;
          subjects_taught?: string[] | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string | null;
          email?: string | null;
          full_name?: string;
          grades_taught?: string[] | null;
          id?: string;
          invited_at?: string | null;
          invited_by?: string | null;
          is_active?: boolean | null;
          notes?: string | null;
          permissions?: Json | null;
          role?: string | null;
          school?: string | null;
          school_borough?: string | null;
          school_name?: string | null;
          subjects?: string[] | null;
          subjects_taught?: string[] | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      user_schools: {
        Row: {
          created_at: string;
          school_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          school_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          school_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_schools_school_id_fkey';
            columns: ['school_id'];
            isOneToOne: false;
            referencedRelation: 'schools';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      lessons_with_metadata: {
        Row: {
          academic_integration: string[] | null;
          academic_integration_array: Json | null;
          activity_type_meta: string | null;
          canonical_id: string | null;
          confidence: Json | null;
          content_embedding: string | null;
          content_hash: string | null;
          content_text: string | null;
          cooking_methods: string[] | null;
          cooking_skills: string[] | null;
          cooking_skills_array: Json | null;
          core_competencies: string[] | null;
          core_competencies_array: Json | null;
          created_at: string | null;
          cultural_heritage: string[] | null;
          cultural_heritage_array: Json | null;
          cultural_responsiveness_features: string[] | null;
          duration_minutes_meta: string | null;
          file_link: string | null;
          flagged_for_review: boolean | null;
          garden_skills: string[] | null;
          garden_skills_array: Json | null;
          grade_levels: string[] | null;
          grade_levels_array: Json | null;
          group_size_meta: string | null;
          has_versions: boolean | null;
          id: string | null;
          last_modified: string | null;
          lesson_format: string | null;
          lesson_id: string | null;
          location_meta: string | null;
          location_requirements: string[] | null;
          main_ingredients: string[] | null;
          main_ingredients_array: Json | null;
          materials_array: Json | null;
          metadata: Json | null;
          observances_array: Json | null;
          observances_holidays: string[] | null;
          original_submission_id: string | null;
          prep_time_minutes_meta: string | null;
          processing_notes: string | null;
          review_notes: string | null;
          search_vector: unknown | null;
          season_meta: string | null;
          season_timing: string[] | null;
          sel_competencies_array: Json | null;
          social_emotional_learning: string[] | null;
          summary: string | null;
          tags: string[] | null;
          thematic_categories: string[] | null;
          themes_array: Json | null;
          timing_meta: string | null;
          title: string | null;
          updated_at: string | null;
          version_number: number | null;
        };
        Insert: {
          academic_integration?: string[] | null;
          academic_integration_array?: never;
          activity_type_meta?: never;
          canonical_id?: string | null;
          confidence?: Json | null;
          content_embedding?: string | null;
          content_hash?: string | null;
          content_text?: string | null;
          cooking_methods?: string[] | null;
          cooking_skills?: string[] | null;
          cooking_skills_array?: never;
          core_competencies?: string[] | null;
          core_competencies_array?: never;
          created_at?: string | null;
          cultural_heritage?: string[] | null;
          cultural_heritage_array?: never;
          cultural_responsiveness_features?: string[] | null;
          duration_minutes_meta?: never;
          file_link?: string | null;
          flagged_for_review?: boolean | null;
          garden_skills?: string[] | null;
          garden_skills_array?: never;
          grade_levels?: string[] | null;
          grade_levels_array?: never;
          group_size_meta?: never;
          has_versions?: boolean | null;
          id?: string | null;
          last_modified?: string | null;
          lesson_format?: string | null;
          lesson_id?: string | null;
          location_meta?: never;
          location_requirements?: string[] | null;
          main_ingredients?: string[] | null;
          main_ingredients_array?: never;
          materials_array?: never;
          metadata?: Json | null;
          observances_array?: never;
          observances_holidays?: string[] | null;
          original_submission_id?: string | null;
          prep_time_minutes_meta?: never;
          processing_notes?: string | null;
          review_notes?: string | null;
          search_vector?: unknown | null;
          season_meta?: never;
          season_timing?: string[] | null;
          sel_competencies_array?: never;
          social_emotional_learning?: string[] | null;
          summary?: string | null;
          tags?: string[] | null;
          thematic_categories?: string[] | null;
          themes_array?: never;
          timing_meta?: never;
          title?: string | null;
          updated_at?: string | null;
          version_number?: number | null;
        };
        Update: {
          academic_integration?: string[] | null;
          academic_integration_array?: never;
          activity_type_meta?: never;
          canonical_id?: string | null;
          confidence?: Json | null;
          content_embedding?: string | null;
          content_hash?: string | null;
          content_text?: string | null;
          cooking_methods?: string[] | null;
          cooking_skills?: string[] | null;
          cooking_skills_array?: never;
          core_competencies?: string[] | null;
          core_competencies_array?: never;
          created_at?: string | null;
          cultural_heritage?: string[] | null;
          cultural_heritage_array?: never;
          cultural_responsiveness_features?: string[] | null;
          duration_minutes_meta?: never;
          file_link?: string | null;
          flagged_for_review?: boolean | null;
          garden_skills?: string[] | null;
          garden_skills_array?: never;
          grade_levels?: string[] | null;
          grade_levels_array?: never;
          group_size_meta?: never;
          has_versions?: boolean | null;
          id?: string | null;
          last_modified?: string | null;
          lesson_format?: string | null;
          lesson_id?: string | null;
          location_meta?: never;
          location_requirements?: string[] | null;
          main_ingredients?: string[] | null;
          main_ingredients_array?: never;
          materials_array?: never;
          metadata?: Json | null;
          observances_array?: never;
          observances_holidays?: string[] | null;
          original_submission_id?: string | null;
          prep_time_minutes_meta?: never;
          processing_notes?: string | null;
          review_notes?: string | null;
          search_vector?: unknown | null;
          season_meta?: never;
          season_timing?: string[] | null;
          sel_competencies_array?: never;
          social_emotional_learning?: string[] | null;
          summary?: string | null;
          tags?: string[] | null;
          thematic_categories?: string[] | null;
          themes_array?: never;
          timing_meta?: never;
          title?: string | null;
          updated_at?: string | null;
          version_number?: number | null;
        };
        Relationships: [];
      };
      user_profiles_safe: {
        Row: {
          created_at: string | null;
          full_name: string | null;
          grades_taught: string[] | null;
          id: string | null;
          role: string | null;
          school_name: string | null;
          subjects: string[] | null;
        };
        Insert: {
          created_at?: string | null;
          full_name?: string | null;
          grades_taught?: string[] | null;
          id?: string | null;
          role?: string | null;
          school_name?: string | null;
          subjects?: string[] | null;
        };
        Update: {
          created_at?: string | null;
          full_name?: string | null;
          grades_taught?: string[] | null;
          id?: string | null;
          role?: string | null;
          school_name?: string | null;
          subjects?: string[] | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      binary_quantize: {
        Args: { '': string } | { '': unknown };
        Returns: unknown;
      };
      check_security_definer_views: {
        Args: Record<PropertyKey, never>;
        Returns: {
          has_security_definer: boolean;
          view_name: string;
          view_owner: string;
        }[];
      };
      debug_user_email: {
        Args: { user_id: string };
        Returns: {
          details: Json;
          email: string;
          id: string;
          source: string;
        }[];
      };
      expand_cultural_heritage: {
        Args: { cultures: string[] };
        Returns: string[];
      };
      expand_search_with_synonyms: {
        Args: { query_text: string };
        Returns: string;
      };
      find_lessons_by_hash: {
        Args: { hash_value: string };
        Returns: {
          lesson_id: string;
          match_type: string;
          title: string;
        }[];
      };
      find_similar_lessons_by_embedding: {
        Args: {
          max_results?: number;
          query_embedding: string;
          similarity_threshold?: number;
        };
        Returns: {
          lesson_id: string;
          match_type: string;
          similarity_score: number;
          title: string;
        }[];
      };
      generate_lesson_search_vector: {
        Args: {
          p_content_text: string;
          p_cooking_skills: string[];
          p_cultural_heritage: string[];
          p_garden_skills: string[];
          p_main_ingredients: string[];
          p_observances_holidays: string[];
          p_summary: string;
          p_tags: string[];
          p_thematic_categories: string[];
          p_title: string;
        };
        Returns: unknown;
      };
      get_canonical_lesson_id: {
        Args: { p_lesson_id: string };
        Returns: string;
      };
      get_embedding_as_text: {
        Args: { lesson_id_param: string };
        Returns: string;
      };
      get_user_activity_metrics: {
        Args: { p_days?: number; p_user_id: string };
        Returns: {
          last_activity: string;
          last_login: string;
          login_count: number;
          review_count: number;
          submission_count: number;
        }[];
      };
      get_user_emails: {
        Args: { user_ids: string[] };
        Returns: {
          email: string;
          id: string;
        }[];
      };
      get_user_profiles_with_email: {
        Args: Record<PropertyKey, never>;
        Returns: {
          auth_created_at: string;
          auth_email: string;
          created_at: string;
          email: string;
          full_name: string;
          grades_taught: string[];
          id: string;
          invitation_accepted_at: string;
          invited_by: string;
          is_active: boolean;
          last_login_at: string;
          last_sign_in_at: string;
          login_count: number;
          role: string;
          school_id: string;
          school_name: string;
          subjects: string[];
          updated_at: string;
          user_id: string;
        }[];
      };
      gtrgm_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gtrgm_decompress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gtrgm_in: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gtrgm_options: {
        Args: { '': unknown };
        Returns: undefined;
      };
      gtrgm_out: {
        Args: { '': unknown };
        Returns: unknown;
      };
      halfvec_avg: {
        Args: { '': number[] };
        Returns: unknown;
      };
      halfvec_out: {
        Args: { '': unknown };
        Returns: unknown;
      };
      halfvec_send: {
        Args: { '': unknown };
        Returns: string;
      };
      halfvec_typmod_in: {
        Args: { '': unknown[] };
        Returns: number;
      };
      has_role: {
        Args: { p_user_id: string; required_role: string };
        Returns: boolean;
      };
      hnsw_bit_support: {
        Args: { '': unknown };
        Returns: unknown;
      };
      hnsw_halfvec_support: {
        Args: { '': unknown };
        Returns: unknown;
      };
      hnsw_sparsevec_support: {
        Args: { '': unknown };
        Returns: unknown;
      };
      hnswhandler: {
        Args: { '': unknown };
        Returns: unknown;
      };
      is_admin: {
        Args: Record<PropertyKey, never> | { user_id: string };
        Returns: boolean;
      };
      is_duplicate_lesson: {
        Args: { p_lesson_id: string };
        Returns: boolean;
      };
      is_lesson_archived: {
        Args: { p_lesson_id: string };
        Returns: boolean;
      };
      is_reviewer_or_above: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      ivfflat_bit_support: {
        Args: { '': unknown };
        Returns: unknown;
      };
      ivfflat_halfvec_support: {
        Args: { '': unknown };
        Returns: unknown;
      };
      ivfflathandler: {
        Args: { '': unknown };
        Returns: unknown;
      };
      l2_norm: {
        Args: { '': unknown } | { '': unknown };
        Returns: number;
      };
      l2_normalize: {
        Args: { '': string } | { '': unknown } | { '': unknown };
        Returns: string;
      };
      resolve_duplicate_group: {
        Args: {
          p_canonical_id: string;
          p_duplicate_ids: string[];
          p_duplicate_type?: string;
          p_group_id: string;
          p_merge_metadata?: boolean;
          p_parent_group_id?: string;
          p_resolution_mode?: string;
          p_resolution_notes?: string;
          p_similarity_score?: number;
          p_sub_group_name?: string;
          p_title_updates?: Json;
        };
        Returns: Json;
      };
      search_lessons: {
        Args: {
          filter_academic?: string[];
          filter_activity_type?: string[];
          filter_competencies?: string[];
          filter_cooking_method?: string[];
          filter_cultures?: string[];
          filter_grade_levels?: string[];
          filter_lesson_format?: string;
          filter_location?: string[];
          filter_seasons?: string[];
          filter_sel?: string[];
          filter_themes?: string[];
          page_offset?: number;
          page_size?: number;
          search_query?: string;
        };
        Returns: {
          confidence: Json;
          file_link: string;
          grade_levels: string[];
          lesson_id: string;
          metadata: Json;
          rank: number;
          summary: string;
          title: string;
          total_count: number;
        }[];
      };
      set_limit: {
        Args: { '': number };
        Returns: number;
      };
      show_limit: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      show_trgm: {
        Args: { '': string };
        Returns: string[];
      };
      sparsevec_out: {
        Args: { '': unknown };
        Returns: unknown;
      };
      sparsevec_send: {
        Args: { '': unknown };
        Returns: string;
      };
      sparsevec_typmod_in: {
        Args: { '': unknown[] };
        Returns: number;
      };
      track_user_login: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      unaccent: {
        Args: { '': string };
        Returns: string;
      };
      unaccent_init: {
        Args: { '': unknown };
        Returns: unknown;
      };
      validate_invitation_token: {
        Args: { invite_token: string };
        Returns: {
          email: string;
          id: string;
          is_valid: boolean;
          metadata: Json;
          role: string;
          school_borough: string;
          school_name: string;
        }[];
      };
      vector_avg: {
        Args: { '': number[] };
        Returns: string;
      };
      vector_dims: {
        Args: { '': string } | { '': unknown };
        Returns: number;
      };
      vector_norm: {
        Args: { '': string };
        Returns: number;
      };
      vector_out: {
        Args: { '': string };
        Returns: unknown;
      };
      vector_send: {
        Args: { '': string };
        Returns: string;
      };
      vector_typmod_in: {
        Args: { '': unknown[] };
        Returns: number;
      };
      verify_rls_enabled: {
        Args: Record<PropertyKey, never>;
        Returns: {
          policy_count: number;
          rls_enabled: boolean;
          status: string;
          table_name: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
