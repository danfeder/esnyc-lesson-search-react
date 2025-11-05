create sequence "public"."cultural_heritage_hierarchy_id_seq";

create sequence "public"."search_synonyms_id_seq";

drop trigger if exists "update_lesson_submissions_updated_at" on "public"."lesson_submissions";

drop trigger if exists "update_lessons_updated_at" on "public"."lessons";

drop trigger if exists "log_user_profile_changes" on "public"."user_profiles";

drop trigger if exists "update_user_profiles_updated_at" on "public"."user_profiles";

drop trigger if exists "update_lesson_search_vector_trigger" on "public"."lessons";

drop policy "Admins can delete duplicate pairs" on "public"."duplicate_pairs";

drop policy "Admins can insert duplicate pairs" on "public"."duplicate_pairs";

drop policy "Admins can update duplicate pairs" on "public"."duplicate_pairs";

drop policy "Admins can view resolution archive" on "public"."duplicate_resolution_archive";

drop policy "System can insert archive records" on "public"."duplicate_resolution_archive";

drop policy "Teachers can update own drafts" on "public"."lesson_submissions";

drop policy "Admins can delete lessons" on "public"."lessons";

drop policy "Admins can insert lessons" on "public"."lessons";

drop policy "Admins can update lessons" on "public"."lessons";

drop policy "Public can view lessons" on "public"."lessons";

drop policy "Reviewers can update own reviews" on "public"."submission_reviews";

drop policy "Teachers can view own submission reviews" on "public"."submission_reviews";

drop policy "Admins can delete own invitations" on "public"."user_invitations";

drop policy "Admins can update own invitations" on "public"."user_invitations";

drop policy "Public can view invitation by token" on "public"."user_invitations";

drop policy "Admins can view all profiles" on "public"."user_profiles";

drop policy "Service role can insert profiles" on "public"."user_profiles";

drop policy "Users can update own profile" on "public"."user_profiles";

drop policy "Users can view own profile" on "public"."user_profiles";

drop policy "Teachers can create submissions" on "public"."lesson_submissions";

drop policy "Teachers can view own submissions" on "public"."lesson_submissions";

drop policy "Admins can create invitations" on "public"."user_invitations";

drop policy "Admins can view all invitations" on "public"."user_invitations";

drop policy "Admins can update any profile" on "public"."user_profiles";

revoke delete on table "public"."duplicate_pairs" from "anon";

revoke insert on table "public"."duplicate_pairs" from "anon";

revoke references on table "public"."duplicate_pairs" from "anon";

revoke select on table "public"."duplicate_pairs" from "anon";

revoke trigger on table "public"."duplicate_pairs" from "anon";

revoke truncate on table "public"."duplicate_pairs" from "anon";

revoke update on table "public"."duplicate_pairs" from "anon";

revoke delete on table "public"."duplicate_pairs" from "authenticated";

revoke insert on table "public"."duplicate_pairs" from "authenticated";

revoke references on table "public"."duplicate_pairs" from "authenticated";

revoke select on table "public"."duplicate_pairs" from "authenticated";

revoke trigger on table "public"."duplicate_pairs" from "authenticated";

revoke truncate on table "public"."duplicate_pairs" from "authenticated";

revoke update on table "public"."duplicate_pairs" from "authenticated";

revoke delete on table "public"."duplicate_pairs" from "service_role";

revoke insert on table "public"."duplicate_pairs" from "service_role";

revoke references on table "public"."duplicate_pairs" from "service_role";

revoke select on table "public"."duplicate_pairs" from "service_role";

revoke trigger on table "public"."duplicate_pairs" from "service_role";

revoke truncate on table "public"."duplicate_pairs" from "service_role";

revoke update on table "public"."duplicate_pairs" from "service_role";

revoke delete on table "public"."duplicate_resolution_archive" from "anon";

revoke insert on table "public"."duplicate_resolution_archive" from "anon";

revoke references on table "public"."duplicate_resolution_archive" from "anon";

revoke select on table "public"."duplicate_resolution_archive" from "anon";

revoke trigger on table "public"."duplicate_resolution_archive" from "anon";

revoke truncate on table "public"."duplicate_resolution_archive" from "anon";

revoke update on table "public"."duplicate_resolution_archive" from "anon";

revoke delete on table "public"."duplicate_resolution_archive" from "authenticated";

revoke insert on table "public"."duplicate_resolution_archive" from "authenticated";

revoke references on table "public"."duplicate_resolution_archive" from "authenticated";

revoke select on table "public"."duplicate_resolution_archive" from "authenticated";

revoke trigger on table "public"."duplicate_resolution_archive" from "authenticated";

revoke truncate on table "public"."duplicate_resolution_archive" from "authenticated";

revoke update on table "public"."duplicate_resolution_archive" from "authenticated";

revoke delete on table "public"."duplicate_resolution_archive" from "service_role";

revoke insert on table "public"."duplicate_resolution_archive" from "service_role";

revoke references on table "public"."duplicate_resolution_archive" from "service_role";

revoke select on table "public"."duplicate_resolution_archive" from "service_role";

revoke trigger on table "public"."duplicate_resolution_archive" from "service_role";

revoke truncate on table "public"."duplicate_resolution_archive" from "service_role";

revoke update on table "public"."duplicate_resolution_archive" from "service_role";

revoke delete on table "public"."duplicate_resolutions" from "anon";

revoke insert on table "public"."duplicate_resolutions" from "anon";

revoke references on table "public"."duplicate_resolutions" from "anon";

revoke select on table "public"."duplicate_resolutions" from "anon";

revoke trigger on table "public"."duplicate_resolutions" from "anon";

revoke truncate on table "public"."duplicate_resolutions" from "anon";

revoke update on table "public"."duplicate_resolutions" from "anon";

revoke delete on table "public"."duplicate_resolutions" from "authenticated";

revoke insert on table "public"."duplicate_resolutions" from "authenticated";

revoke references on table "public"."duplicate_resolutions" from "authenticated";

revoke select on table "public"."duplicate_resolutions" from "authenticated";

revoke trigger on table "public"."duplicate_resolutions" from "authenticated";

revoke truncate on table "public"."duplicate_resolutions" from "authenticated";

revoke update on table "public"."duplicate_resolutions" from "authenticated";

revoke delete on table "public"."duplicate_resolutions" from "service_role";

revoke insert on table "public"."duplicate_resolutions" from "service_role";

revoke references on table "public"."duplicate_resolutions" from "service_role";

revoke select on table "public"."duplicate_resolutions" from "service_role";

revoke trigger on table "public"."duplicate_resolutions" from "service_role";

revoke truncate on table "public"."duplicate_resolutions" from "service_role";

revoke update on table "public"."duplicate_resolutions" from "service_role";

revoke delete on table "public"."lesson_submissions" from "anon";

revoke insert on table "public"."lesson_submissions" from "anon";

revoke references on table "public"."lesson_submissions" from "anon";

revoke select on table "public"."lesson_submissions" from "anon";

revoke trigger on table "public"."lesson_submissions" from "anon";

revoke truncate on table "public"."lesson_submissions" from "anon";

revoke update on table "public"."lesson_submissions" from "anon";

revoke delete on table "public"."lesson_submissions" from "authenticated";

revoke insert on table "public"."lesson_submissions" from "authenticated";

revoke references on table "public"."lesson_submissions" from "authenticated";

revoke select on table "public"."lesson_submissions" from "authenticated";

revoke trigger on table "public"."lesson_submissions" from "authenticated";

revoke truncate on table "public"."lesson_submissions" from "authenticated";

revoke update on table "public"."lesson_submissions" from "authenticated";

revoke delete on table "public"."lesson_submissions" from "service_role";

revoke insert on table "public"."lesson_submissions" from "service_role";

revoke references on table "public"."lesson_submissions" from "service_role";

revoke select on table "public"."lesson_submissions" from "service_role";

revoke trigger on table "public"."lesson_submissions" from "service_role";

revoke truncate on table "public"."lesson_submissions" from "service_role";

revoke update on table "public"."lesson_submissions" from "service_role";

revoke delete on table "public"."lessons" from "anon";

revoke insert on table "public"."lessons" from "anon";

revoke references on table "public"."lessons" from "anon";

revoke select on table "public"."lessons" from "anon";

revoke trigger on table "public"."lessons" from "anon";

revoke truncate on table "public"."lessons" from "anon";

revoke update on table "public"."lessons" from "anon";

revoke delete on table "public"."lessons" from "authenticated";

revoke insert on table "public"."lessons" from "authenticated";

revoke references on table "public"."lessons" from "authenticated";

revoke select on table "public"."lessons" from "authenticated";

revoke trigger on table "public"."lessons" from "authenticated";

revoke truncate on table "public"."lessons" from "authenticated";

revoke update on table "public"."lessons" from "authenticated";

revoke delete on table "public"."lessons" from "service_role";

revoke insert on table "public"."lessons" from "service_role";

revoke references on table "public"."lessons" from "service_role";

revoke select on table "public"."lessons" from "service_role";

revoke trigger on table "public"."lessons" from "service_role";

revoke truncate on table "public"."lessons" from "service_role";

revoke update on table "public"."lessons" from "service_role";

revoke delete on table "public"."schools" from "anon";

revoke insert on table "public"."schools" from "anon";

revoke references on table "public"."schools" from "anon";

revoke select on table "public"."schools" from "anon";

revoke trigger on table "public"."schools" from "anon";

revoke truncate on table "public"."schools" from "anon";

revoke update on table "public"."schools" from "anon";

revoke delete on table "public"."schools" from "authenticated";

revoke insert on table "public"."schools" from "authenticated";

revoke references on table "public"."schools" from "authenticated";

revoke select on table "public"."schools" from "authenticated";

revoke trigger on table "public"."schools" from "authenticated";

revoke truncate on table "public"."schools" from "authenticated";

revoke update on table "public"."schools" from "authenticated";

revoke delete on table "public"."schools" from "service_role";

revoke insert on table "public"."schools" from "service_role";

revoke references on table "public"."schools" from "service_role";

revoke select on table "public"."schools" from "service_role";

revoke trigger on table "public"."schools" from "service_role";

revoke truncate on table "public"."schools" from "service_role";

revoke update on table "public"."schools" from "service_role";

revoke delete on table "public"."submission_reviews" from "anon";

revoke insert on table "public"."submission_reviews" from "anon";

revoke references on table "public"."submission_reviews" from "anon";

revoke select on table "public"."submission_reviews" from "anon";

revoke trigger on table "public"."submission_reviews" from "anon";

revoke truncate on table "public"."submission_reviews" from "anon";

revoke update on table "public"."submission_reviews" from "anon";

revoke delete on table "public"."submission_reviews" from "authenticated";

revoke insert on table "public"."submission_reviews" from "authenticated";

revoke references on table "public"."submission_reviews" from "authenticated";

revoke select on table "public"."submission_reviews" from "authenticated";

revoke trigger on table "public"."submission_reviews" from "authenticated";

revoke truncate on table "public"."submission_reviews" from "authenticated";

revoke update on table "public"."submission_reviews" from "authenticated";

revoke delete on table "public"."submission_reviews" from "service_role";

revoke insert on table "public"."submission_reviews" from "service_role";

revoke references on table "public"."submission_reviews" from "service_role";

revoke select on table "public"."submission_reviews" from "service_role";

revoke trigger on table "public"."submission_reviews" from "service_role";

revoke truncate on table "public"."submission_reviews" from "service_role";

revoke update on table "public"."submission_reviews" from "service_role";

revoke delete on table "public"."user_invitations" from "anon";

revoke insert on table "public"."user_invitations" from "anon";

revoke references on table "public"."user_invitations" from "anon";

revoke select on table "public"."user_invitations" from "anon";

revoke trigger on table "public"."user_invitations" from "anon";

revoke truncate on table "public"."user_invitations" from "anon";

revoke update on table "public"."user_invitations" from "anon";

revoke delete on table "public"."user_invitations" from "authenticated";

revoke insert on table "public"."user_invitations" from "authenticated";

revoke references on table "public"."user_invitations" from "authenticated";

revoke select on table "public"."user_invitations" from "authenticated";

revoke trigger on table "public"."user_invitations" from "authenticated";

revoke truncate on table "public"."user_invitations" from "authenticated";

revoke update on table "public"."user_invitations" from "authenticated";

revoke delete on table "public"."user_invitations" from "service_role";

revoke insert on table "public"."user_invitations" from "service_role";

revoke references on table "public"."user_invitations" from "service_role";

revoke select on table "public"."user_invitations" from "service_role";

revoke trigger on table "public"."user_invitations" from "service_role";

revoke truncate on table "public"."user_invitations" from "service_role";

revoke update on table "public"."user_invitations" from "service_role";

revoke delete on table "public"."user_management_audit" from "anon";

revoke insert on table "public"."user_management_audit" from "anon";

revoke references on table "public"."user_management_audit" from "anon";

revoke select on table "public"."user_management_audit" from "anon";

revoke trigger on table "public"."user_management_audit" from "anon";

revoke truncate on table "public"."user_management_audit" from "anon";

revoke update on table "public"."user_management_audit" from "anon";

revoke delete on table "public"."user_management_audit" from "authenticated";

revoke insert on table "public"."user_management_audit" from "authenticated";

revoke references on table "public"."user_management_audit" from "authenticated";

revoke select on table "public"."user_management_audit" from "authenticated";

revoke trigger on table "public"."user_management_audit" from "authenticated";

revoke truncate on table "public"."user_management_audit" from "authenticated";

revoke update on table "public"."user_management_audit" from "authenticated";

revoke delete on table "public"."user_management_audit" from "service_role";

revoke insert on table "public"."user_management_audit" from "service_role";

revoke references on table "public"."user_management_audit" from "service_role";

revoke select on table "public"."user_management_audit" from "service_role";

revoke trigger on table "public"."user_management_audit" from "service_role";

revoke truncate on table "public"."user_management_audit" from "service_role";

revoke update on table "public"."user_management_audit" from "service_role";

revoke delete on table "public"."user_profiles" from "anon";

revoke insert on table "public"."user_profiles" from "anon";

revoke references on table "public"."user_profiles" from "anon";

revoke select on table "public"."user_profiles" from "anon";

revoke trigger on table "public"."user_profiles" from "anon";

revoke truncate on table "public"."user_profiles" from "anon";

revoke update on table "public"."user_profiles" from "anon";

revoke delete on table "public"."user_profiles" from "authenticated";

revoke insert on table "public"."user_profiles" from "authenticated";

revoke references on table "public"."user_profiles" from "authenticated";

revoke select on table "public"."user_profiles" from "authenticated";

revoke trigger on table "public"."user_profiles" from "authenticated";

revoke truncate on table "public"."user_profiles" from "authenticated";

revoke update on table "public"."user_profiles" from "authenticated";

revoke delete on table "public"."user_profiles" from "service_role";

revoke insert on table "public"."user_profiles" from "service_role";

revoke references on table "public"."user_profiles" from "service_role";

revoke select on table "public"."user_profiles" from "service_role";

revoke trigger on table "public"."user_profiles" from "service_role";

revoke truncate on table "public"."user_profiles" from "service_role";

revoke update on table "public"."user_profiles" from "service_role";

revoke delete on table "public"."user_schools" from "anon";

revoke insert on table "public"."user_schools" from "anon";

revoke references on table "public"."user_schools" from "anon";

revoke select on table "public"."user_schools" from "anon";

revoke trigger on table "public"."user_schools" from "anon";

revoke truncate on table "public"."user_schools" from "anon";

revoke update on table "public"."user_schools" from "anon";

revoke delete on table "public"."user_schools" from "authenticated";

revoke insert on table "public"."user_schools" from "authenticated";

revoke references on table "public"."user_schools" from "authenticated";

revoke select on table "public"."user_schools" from "authenticated";

revoke trigger on table "public"."user_schools" from "authenticated";

revoke truncate on table "public"."user_schools" from "authenticated";

revoke update on table "public"."user_schools" from "authenticated";

revoke delete on table "public"."user_schools" from "service_role";

revoke insert on table "public"."user_schools" from "service_role";

revoke references on table "public"."user_schools" from "service_role";

revoke select on table "public"."user_schools" from "service_role";

revoke trigger on table "public"."user_schools" from "service_role";

revoke truncate on table "public"."user_schools" from "service_role";

revoke update on table "public"."user_schools" from "service_role";

alter table "public"."duplicate_pairs" drop constraint "different_lessons";

alter table "public"."duplicate_pairs" drop constraint "duplicate_pairs_lesson1_id_fkey";

alter table "public"."duplicate_pairs" drop constraint "duplicate_pairs_lesson2_id_fkey";

alter table "public"."duplicate_pairs" drop constraint "duplicate_pairs_resolved_by_fkey";

alter table "public"."duplicate_pairs" drop constraint "duplicate_pairs_similarity_score_check";

alter table "public"."duplicate_pairs" drop constraint "duplicate_pairs_status_check";

alter table "public"."duplicate_resolution_archive" drop constraint "duplicate_resolution_archive_merged_by_fkey";

alter table "public"."duplicate_resolutions" drop constraint "duplicate_resolutions_similarity_score_check";

alter table "public"."lesson_submissions" drop constraint "lesson_submissions_approved_lesson_id_fkey";

alter table "public"."submission_reviews" drop constraint "submission_reviews_status_check";

alter table "public"."user_invitations" drop constraint "unique_pending_invitation_per_email";

alter table "public"."user_profiles" drop constraint "user_profiles_email_key";

alter table "public"."user_profiles" drop constraint "user_profiles_id_fkey";

alter table "public"."duplicate_resolutions" drop constraint "duplicate_resolutions_action_taken_check";

alter table "public"."lesson_submissions" drop constraint "lesson_submissions_status_check";

alter table "public"."submission_reviews" drop constraint "submission_reviews_submission_id_fkey";

alter table "public"."user_management_audit" drop constraint "user_management_audit_actor_id_fkey";

alter table "public"."user_management_audit" drop constraint "user_management_audit_target_user_id_fkey";

alter table "public"."user_profiles" drop constraint "user_profiles_role_check";

drop function if exists "public"."calculate_text_similarity"(text1 text, text2 text);

drop function if exists "public"."detect_all_duplicates"(p_threshold numeric, p_limit integer);

drop function if exists "public"."find_potential_duplicates"(p_lesson_id uuid, p_threshold numeric);

drop function if exists "public"."generate_search_vector"(p_title text, p_summary text, p_ingredients jsonb, p_skills jsonb, p_themes jsonb, p_cultural_heritage jsonb);

drop function if exists "public"."log_user_activity"();

drop function if exists "public"."resolve_duplicate_group"(p_group_id text, p_canonical_id text, p_duplicate_ids text[], p_duplicate_type text, p_similarity_score double precision, p_merge_metadata boolean, p_resolution_notes text);

drop function if exists "public"."resolve_duplicate_pair"(p_duplicate_pair_id uuid, p_primary_lesson_id uuid, p_resolution_notes text);

drop function if exists "public"."search_lessons"(search_query text, location_filter text, grade_levels text[], activity_types text[], seasons text[], themes text[], competencies text[], cultural_heritage_filter text[], academic_integration_filter text[], sel_filter text[], lesson_format_filter text, cooking_method_filter text);

drop view if exists "public"."user_profiles_with_emails";

drop function if exists "public"."get_user_emails"(user_ids uuid[]);

drop function if exists "public"."get_user_profiles_with_email"();

drop view if exists "public"."user_profiles_safe";

alter table "public"."duplicate_pairs" drop constraint "duplicate_pairs_pkey";

alter table "public"."duplicate_resolution_archive" drop constraint "duplicate_resolution_archive_pkey";

drop index if exists "public"."duplicate_pairs_pkey";

drop index if exists "public"."duplicate_resolution_archive_pkey";

drop index if exists "public"."idx_duplicate_pairs_lesson1";

drop index if exists "public"."idx_duplicate_pairs_lesson2";

drop index if exists "public"."idx_duplicate_pairs_similarity";

drop index if exists "public"."idx_duplicate_pairs_status";

drop index if exists "public"."idx_duplicate_resolutions_canonical";

drop index if exists "public"."idx_duplicate_resolutions_group_id";

drop index if exists "public"."idx_duplicate_resolutions_resolved_at";

drop index if exists "public"."idx_duplicate_resolutions_resolved_by";

drop index if exists "public"."idx_invitations_expired";

drop index if exists "public"."idx_lessons_academic_bool";

drop index if exists "public"."idx_lessons_competency_bool";

drop index if exists "public"."idx_lessons_format_method";

drop index if exists "public"."idx_lessons_grade_level";

drop index if exists "public"."idx_lessons_season";

drop index if exists "public"."idx_lessons_sel_bool";

drop index if exists "public"."idx_lessons_themes_bool";

drop index if exists "public"."idx_resolution_archive_archived";

drop index if exists "public"."idx_resolution_archive_primary";

drop index if exists "public"."idx_submissions_status_teacher";

drop index if exists "public"."idx_unique_lesson_pair";

drop index if exists "public"."user_profiles_email_key";

drop index if exists "public"."idx_audit_login_actions";

drop index if exists "public"."idx_lessons_activity_type";

drop index if exists "public"."idx_lessons_location";

drop index if exists "public"."idx_lessons_sel";

drop index if exists "public"."idx_lessons_themes";

drop index if exists "public"."unique_pending_invitation_per_email";

drop table "public"."duplicate_pairs";

drop table "public"."duplicate_resolution_archive";

create table "public"."bookmarks" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "lesson_id" text not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."bookmarks" enable row level security;

create table "public"."canonical_lessons" (
    "duplicate_id" text not null,
    "canonical_id" text not null,
    "similarity_score" double precision not null,
    "resolution_type" text not null,
    "resolved_by" uuid,
    "resolved_at" timestamp with time zone default now(),
    "resolution_notes" text
);


alter table "public"."canonical_lessons" enable row level security;

create table "public"."cultural_heritage_hierarchy" (
    "id" integer not null default nextval('cultural_heritage_hierarchy_id_seq'::regclass),
    "parent" text not null,
    "children" text[] not null
);


alter table "public"."cultural_heritage_hierarchy" enable row level security;

create table "public"."lesson_archive" (
    "id" uuid not null,
    "lesson_id" text not null,
    "title" text not null,
    "summary" text not null,
    "file_link" text not null,
    "grade_levels" text[] not null default '{}'::text[],
    "metadata" jsonb not null default '{}'::jsonb,
    "confidence" jsonb not null default '{}'::jsonb,
    "search_vector" tsvector,
    "content_text" text,
    "content_embedding" vector(1536),
    "content_hash" character varying(64),
    "last_modified" timestamp with time zone,
    "created_at" timestamp with time zone not null,
    "updated_at" timestamp with time zone,
    "thematic_categories" text[],
    "cultural_heritage" text[],
    "observances_holidays" text[],
    "location_requirements" text[],
    "season_timing" text[],
    "academic_integration" text[],
    "social_emotional_learning" text[],
    "cooking_methods" text[],
    "main_ingredients" text[],
    "cultural_responsiveness_features" text[],
    "garden_skills" text[],
    "cooking_skills" text[],
    "core_competencies" text[],
    "lesson_format" text,
    "processing_notes" text,
    "review_notes" text,
    "flagged_for_review" boolean default false,
    "tags" text[],
    "archived_at" timestamp with time zone not null default now(),
    "archived_by" uuid,
    "archive_reason" text not null,
    "canonical_id" text,
    "version_number" integer default 1,
    "has_versions" boolean default false,
    "original_submission_id" uuid,
    "activity_type" text,
    "archived_by_system" text
);


alter table "public"."lesson_archive" enable row level security;

create table "public"."lesson_collections" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "name" text not null,
    "description" text,
    "lesson_ids" text[] default '{}'::text[],
    "is_public" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."lesson_collections" enable row level security;

create table "public"."lesson_versions" (
    "id" uuid not null default gen_random_uuid(),
    "lesson_id" text not null,
    "version_number" integer not null,
    "title" text not null,
    "summary" text not null,
    "file_link" text not null,
    "grade_levels" text[] not null,
    "metadata" jsonb not null,
    "content_text" text,
    "archived_from_submission_id" uuid,
    "archived_by" uuid,
    "archived_at" timestamp with time zone default now(),
    "archive_reason" text
);


alter table "public"."lesson_versions" enable row level security;

create table "public"."saved_searches" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "name" text not null,
    "filters" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."saved_searches" enable row level security;

create table "public"."search_synonyms" (
    "id" integer not null default nextval('search_synonyms_id_seq'::regclass),
    "term" text not null,
    "synonyms" text[] not null,
    "synonym_type" text
);


alter table "public"."search_synonyms" enable row level security;

create table "public"."submission_similarities" (
    "id" uuid not null default gen_random_uuid(),
    "submission_id" uuid not null,
    "lesson_id" text not null,
    "title_similarity" double precision,
    "content_similarity" double precision,
    "metadata_overlap_score" double precision,
    "combined_score" double precision,
    "match_type" text,
    "match_details" jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."submission_similarities" enable row level security;

alter table "public"."duplicate_resolutions" add column "parent_group_id" text;

alter table "public"."duplicate_resolutions" add column "resolution_mode" text default 'single'::text;

alter table "public"."duplicate_resolutions" add column "sub_group_name" text;

alter table "public"."lesson_submissions" drop column "academic_integration";

alter table "public"."lesson_submissions" drop column "activity_type";

alter table "public"."lesson_submissions" drop column "ai_feedback";

alter table "public"."lesson_submissions" drop column "ai_review_status";

alter table "public"."lesson_submissions" drop column "ai_score";

alter table "public"."lesson_submissions" drop column "approved_lesson_id";

alter table "public"."lesson_submissions" drop column "big_idea";

alter table "public"."lesson_submissions" drop column "cooking_method";

alter table "public"."lesson_submissions" drop column "cooking_skills";

alter table "public"."lesson_submissions" drop column "core_competencies";

alter table "public"."lesson_submissions" drop column "cultural_heritage";

alter table "public"."lesson_submissions" drop column "directions";

alter table "public"."lesson_submissions" drop column "duration_in_minutes";

alter table "public"."lesson_submissions" drop column "essential_question";

alter table "public"."lesson_submissions" drop column "garden_skills";

alter table "public"."lesson_submissions" drop column "grade_level";

alter table "public"."lesson_submissions" drop column "group_size";

alter table "public"."lesson_submissions" drop column "ingredients";

alter table "public"."lesson_submissions" drop column "lesson_format";

alter table "public"."lesson_submissions" drop column "location";

alter table "public"."lesson_submissions" drop column "materials";

alter table "public"."lesson_submissions" drop column "metadata";

alter table "public"."lesson_submissions" drop column "observances_and_holidays";

alter table "public"."lesson_submissions" drop column "season";

alter table "public"."lesson_submissions" drop column "skills";

alter table "public"."lesson_submissions" drop column "social_emotional_learning";

alter table "public"."lesson_submissions" drop column "student_thinking";

alter table "public"."lesson_submissions" drop column "submitted_at";

alter table "public"."lesson_submissions" drop column "summary";

alter table "public"."lesson_submissions" drop column "themes_and_topics";

alter table "public"."lesson_submissions" drop column "title";

alter table "public"."lesson_submissions" add column "content_embedding" vector(1536);

alter table "public"."lesson_submissions" add column "content_hash" character varying(64);

alter table "public"."lesson_submissions" add column "extracted_content" text;

alter table "public"."lesson_submissions" add column "extracted_title" text;

alter table "public"."lesson_submissions" add column "google_doc_id" text not null;

alter table "public"."lesson_submissions" add column "google_doc_url" text not null;

alter table "public"."lesson_submissions" add column "original_lesson_id" text;

alter table "public"."lesson_submissions" add column "reviewed_at" timestamp with time zone;

alter table "public"."lesson_submissions" add column "reviewed_by" uuid;

alter table "public"."lesson_submissions" add column "reviewer_id" uuid;

alter table "public"."lesson_submissions" add column "reviewer_notes" text;

alter table "public"."lesson_submissions" add column "revision_requested_reason" text;

alter table "public"."lesson_submissions" add column "submission_type" text not null default 'new'::text;

alter table "public"."lesson_submissions" alter column "id" set default gen_random_uuid();

alter table "public"."lesson_submissions" alter column "status" set default 'submitted'::text;

alter table "public"."lesson_submissions" alter column "status" set not null;

alter table "public"."lesson_submissions" alter column "teacher_id" set not null;

alter table "public"."lessons" drop column "academic_arts";

alter table "public"."lessons" drop column "academic_health";

alter table "public"."lessons" drop column "academic_literacy_ela";

alter table "public"."lessons" drop column "academic_math";

alter table "public"."lessons" drop column "academic_science";

alter table "public"."lessons" drop column "academic_social_studies";

alter table "public"."lessons" drop column "big_idea";

alter table "public"."lessons" drop column "competency_community_building";

alter table "public"."lessons" drop column "competency_cultural_connections";

alter table "public"."lessons" drop column "competency_growing_food";

alter table "public"."lessons" drop column "competency_healthy_choices";

alter table "public"."lessons" drop column "competency_nature_exploration";

alter table "public"."lessons" drop column "competency_preparing_food";

alter table "public"."lessons" drop column "cooking_method";

alter table "public"."lessons" drop column "directions";

alter table "public"."lessons" drop column "duration_in_minutes";

alter table "public"."lessons" drop column "essential_question";

alter table "public"."lessons" drop column "gdoc_url";

alter table "public"."lessons" drop column "grade_level";

alter table "public"."lessons" drop column "group_size";

alter table "public"."lessons" drop column "ingredients";

alter table "public"."lessons" drop column "location";

alter table "public"."lessons" drop column "materials";

alter table "public"."lessons" drop column "notes";

alter table "public"."lessons" drop column "observances_and_holidays";

alter table "public"."lessons" drop column "review_status";

alter table "public"."lessons" drop column "season";

alter table "public"."lessons" drop column "sel_relationship_skills";

alter table "public"."lessons" drop column "sel_responsible_decision_making";

alter table "public"."lessons" drop column "sel_self_awareness";

alter table "public"."lessons" drop column "sel_self_management";

alter table "public"."lessons" drop column "sel_social_awareness";

alter table "public"."lessons" drop column "skills";

alter table "public"."lessons" drop column "student_thinking";

alter table "public"."lessons" drop column "theme_ecosystems";

alter table "public"."lessons" drop column "theme_food_justice";

alter table "public"."lessons" drop column "theme_food_systems";

alter table "public"."lessons" drop column "theme_garden_basics";

alter table "public"."lessons" drop column "theme_garden_communities";

alter table "public"."lessons" drop column "theme_plant_growth";

alter table "public"."lessons" drop column "theme_seed_to_table";

alter table "public"."lessons" drop column "themes_and_topics";

alter table "public"."lessons" add column "canonical_id" text;

alter table "public"."lessons" add column "confidence" jsonb not null default '{}'::jsonb;

alter table "public"."lessons" add column "content_text" text;

alter table "public"."lessons" add column "cultural_responsiveness_features" text[];

alter table "public"."lessons" add column "file_link" text not null;

alter table "public"."lessons" add column "flagged_for_review" boolean default false;

alter table "public"."lessons" add column "grade_levels" text[] not null default '{}'::text[];

alter table "public"."lessons" add column "has_versions" boolean default false;

alter table "public"."lessons" add column "lesson_id" text not null;

alter table "public"."lessons" add column "location_requirements" text[];

alter table "public"."lessons" add column "main_ingredients" text[];

alter table "public"."lessons" add column "observances_holidays" text[];

alter table "public"."lessons" add column "original_submission_id" uuid;

alter table "public"."lessons" add column "processing_notes" text;

alter table "public"."lessons" add column "review_notes" text;

alter table "public"."lessons" add column "tags" text[];

alter table "public"."lessons" add column "thematic_categories" text[];

alter table "public"."lessons" add column "version_number" integer default 1;

alter table "public"."lessons" alter column "academic_integration" set data type text[] using "academic_integration"::text[];

alter table "public"."lessons" alter column "content_hash" set data type character varying(64) using "content_hash"::character varying(64);

alter table "public"."lessons" alter column "cooking_skills" set data type text[] using "cooking_skills"::text[];

alter table "public"."lessons" alter column "core_competencies" set data type text[] using "core_competencies"::text[];

alter table "public"."lessons" alter column "cultural_heritage" set data type text[] using "cultural_heritage"::text[];

alter table "public"."lessons" alter column "garden_skills" set data type text[] using "garden_skills"::text[];

alter table "public"."lessons" alter column "id" set default gen_random_uuid();

alter table "public"."lessons" alter column "last_modified" drop default;

alter table "public"."lessons" alter column "metadata" set not null;

alter table "public"."lessons" alter column "social_emotional_learning" set data type text[] using "social_emotional_learning"::text[];

alter table "public"."lessons" alter column "summary" set not null;

alter table "public"."submission_reviews" drop column "feedback";

alter table "public"."submission_reviews" drop column "internal_notes";

alter table "public"."submission_reviews" drop column "metadata";

alter table "public"."submission_reviews" drop column "status";

alter table "public"."submission_reviews" add column "canonical_lesson_id" text;

alter table "public"."submission_reviews" add column "decision" text;

alter table "public"."submission_reviews" add column "detected_duplicates" jsonb default '[]'::jsonb;

alter table "public"."submission_reviews" add column "notes" text;

alter table "public"."submission_reviews" add column "review_completed_at" timestamp with time zone;

alter table "public"."submission_reviews" add column "review_started_at" timestamp with time zone default now();

alter table "public"."submission_reviews" add column "tagged_metadata" jsonb not null default '{}'::jsonb;

alter table "public"."submission_reviews" add column "time_spent_seconds" integer;

alter table "public"."submission_reviews" alter column "id" set default gen_random_uuid();

alter table "public"."submission_reviews" alter column "reviewer_id" set not null;

alter table "public"."submission_reviews" alter column "submission_id" set not null;

alter table "public"."user_invitations" add column "invited_at" timestamp with time zone not null default now();

alter table "public"."user_invitations" alter column "created_at" set not null;

alter table "public"."user_invitations" alter column "expires_at" set not null;

alter table "public"."user_invitations" alter column "id" set default gen_random_uuid();

alter table "public"."user_invitations" alter column "token" set default (gen_random_uuid())::text;

alter table "public"."user_invitations" alter column "token" set not null;

alter table "public"."user_management_audit" add column "ip_address" inet;

alter table "public"."user_management_audit" add column "user_agent" text;

alter table "public"."user_management_audit" alter column "actor_id" set not null;

alter table "public"."user_management_audit" alter column "created_at" set not null;

alter table "public"."user_management_audit" alter column "id" set default gen_random_uuid();

alter table "public"."user_profiles" drop column "last_login";

alter table "public"."user_profiles" add column "permissions" jsonb default '{}'::jsonb;

alter table "public"."user_profiles" add column "school" text;

alter table "public"."user_profiles" add column "subjects" text[] default '{}'::text[];

alter table "public"."user_profiles" alter column "email" drop not null;

alter table "public"."user_profiles" alter column "full_name" set not null;

alter table "public"."user_profiles" alter column "grades_taught" set default '{}'::text[];

alter table "public"."user_profiles" alter column "grades_taught" set data type text[] using "grades_taught"::text[];

alter table "public"."user_profiles" alter column "id" set default gen_random_uuid();

alter table "public"."user_profiles" alter column "subjects_taught" set data type text[] using "subjects_taught"::text[];

alter sequence "public"."cultural_heritage_hierarchy_id_seq" owned by "public"."cultural_heritage_hierarchy"."id";

alter sequence "public"."search_synonyms_id_seq" owned by "public"."search_synonyms"."id";

CREATE UNIQUE INDEX bookmarks_pkey ON public.bookmarks USING btree (id);

CREATE UNIQUE INDEX bookmarks_user_id_lesson_id_key ON public.bookmarks USING btree (user_id, lesson_id);

CREATE UNIQUE INDEX canonical_lessons_pkey ON public.canonical_lessons USING btree (duplicate_id);

CREATE UNIQUE INDEX cultural_heritage_hierarchy_pkey ON public.cultural_heritage_hierarchy USING btree (id);

CREATE INDEX idx_archive_canonical ON public.lesson_archive USING btree (canonical_id);

CREATE INDEX idx_archive_date ON public.lesson_archive USING btree (archived_at);

CREATE INDEX idx_archive_reason ON public.lesson_archive USING btree (archive_reason);

CREATE INDEX idx_audit_action ON public.user_management_audit USING btree (action);

CREATE INDEX idx_audit_actor ON public.user_management_audit USING btree (actor_id);

CREATE INDEX idx_audit_created ON public.user_management_audit USING btree (created_at DESC);

CREATE INDEX idx_audit_target ON public.user_management_audit USING btree (target_user_id);

CREATE INDEX idx_audit_target_email ON public.user_management_audit USING btree (target_email);

CREATE INDEX idx_bookmarks_lesson_id ON public.bookmarks USING btree (lesson_id);

CREATE INDEX idx_bookmarks_user_id ON public.bookmarks USING btree (user_id);

CREATE INDEX idx_canonical_id ON public.canonical_lessons USING btree (canonical_id);

CREATE INDEX idx_duplicate_resolutions_parent_group ON public.duplicate_resolutions USING btree (parent_group_id) WHERE (parent_group_id IS NOT NULL);

CREATE INDEX idx_invitations_email ON public.user_invitations USING btree (email);

CREATE INDEX idx_invitations_expires_at ON public.user_invitations USING btree (expires_at) WHERE (accepted_at IS NULL);

CREATE INDEX idx_invitations_invited_by ON public.user_invitations USING btree (invited_by);

CREATE INDEX idx_invitations_token ON public.user_invitations USING btree (token);

CREATE INDEX idx_lesson_collections_user_id ON public.lesson_collections USING btree (user_id);

CREATE INDEX idx_lessons_academic ON public.lessons USING gin ((((metadata -> 'academicIntegration'::text) -> 'selected'::text)));

CREATE INDEX idx_lessons_canonical ON public.lessons USING btree (canonical_id) WHERE (canonical_id IS NOT NULL);

CREATE INDEX idx_lessons_competencies ON public.lessons USING gin (((metadata -> 'coreCompetencies'::text)));

CREATE INDEX idx_lessons_confidence ON public.lessons USING btree ((((confidence ->> 'overall'::text))::double precision));

CREATE INDEX idx_lessons_cooking ON public.lessons USING btree (((metadata ->> 'cookingMethods'::text)));

CREATE INDEX idx_lessons_cooking_skills ON public.lessons USING gin (cooking_skills);

CREATE INDEX idx_lessons_cultures ON public.lessons USING gin (((metadata -> 'culturalHeritage'::text)));

CREATE INDEX idx_lessons_flagged ON public.lessons USING btree (flagged_for_review) WHERE (flagged_for_review = true);

CREATE INDEX idx_lessons_format ON public.lessons USING btree (((metadata ->> 'lessonFormat'::text)));

CREATE INDEX idx_lessons_garden_skills ON public.lessons USING gin (garden_skills);

CREATE INDEX idx_lessons_grade_levels ON public.lessons USING gin (grade_levels);

CREATE INDEX idx_lessons_hash ON public.lessons USING btree (content_hash) WHERE (content_hash IS NOT NULL);

CREATE INDEX idx_lessons_hash_id ON public.lessons USING btree (content_hash, lesson_id) WHERE (content_hash IS NOT NULL);

CREATE INDEX idx_lessons_last_modified ON public.lessons USING btree (last_modified DESC NULLS LAST);

CREATE INDEX idx_lessons_lesson_format ON public.lessons USING btree (lesson_format);

CREATE INDEX idx_lessons_location_requirements ON public.lessons USING gin (location_requirements);

CREATE INDEX idx_lessons_main_ingredients ON public.lessons USING gin (main_ingredients);

CREATE INDEX idx_lessons_metadata ON public.lessons USING gin (metadata);

CREATE INDEX idx_lessons_observances_holidays ON public.lessons USING gin (observances_holidays);

CREATE INDEX idx_lessons_processing_notes ON public.lessons USING gin (to_tsvector('english'::regconfig, processing_notes));

CREATE INDEX idx_lessons_seasons ON public.lessons USING gin (((metadata -> 'seasonTiming'::text)));

CREATE INDEX idx_lessons_social_emotional_learning ON public.lessons USING gin (social_emotional_learning);

CREATE INDEX idx_lessons_summary ON public.lessons USING gin (summary gin_trgm_ops);

CREATE INDEX idx_lessons_summary_trgm ON public.lessons USING gin (summary gin_trgm_ops);

CREATE INDEX idx_lessons_tags ON public.lessons USING gin (tags);

CREATE INDEX idx_lessons_thematic_categories ON public.lessons USING gin (thematic_categories);

CREATE INDEX idx_lessons_title ON public.lessons USING gin (title gin_trgm_ops);

CREATE INDEX idx_lessons_title_trgm ON public.lessons USING gin (title gin_trgm_ops);

CREATE INDEX idx_resolution_canonical ON public.duplicate_resolutions USING btree (canonical_lesson_id);

CREATE INDEX idx_resolution_date ON public.duplicate_resolutions USING btree (resolved_at);

CREATE INDEX idx_resolution_group ON public.duplicate_resolutions USING btree (group_id);

CREATE INDEX idx_reviews_reviewer ON public.submission_reviews USING btree (reviewer_id);

CREATE INDEX idx_reviews_submission ON public.submission_reviews USING btree (submission_id);

CREATE INDEX idx_saved_searches_user_id ON public.saved_searches USING btree (user_id);

CREATE INDEX idx_similarities_score ON public.submission_similarities USING btree (combined_score DESC);

CREATE INDEX idx_similarities_submission ON public.submission_similarities USING btree (submission_id);

CREATE INDEX idx_submissions_embedding ON public.lesson_submissions USING ivfflat (content_embedding vector_cosine_ops) WITH (lists='50');

CREATE INDEX idx_submissions_google_doc_id ON public.lesson_submissions USING btree (google_doc_id);

CREATE INDEX idx_submissions_hash ON public.lesson_submissions USING btree (content_hash);

CREATE INDEX idx_submissions_status ON public.lesson_submissions USING btree (status);

CREATE INDEX idx_submissions_teacher ON public.lesson_submissions USING btree (teacher_id);

CREATE INDEX idx_synonyms_array ON public.search_synonyms USING gin (synonyms);

CREATE INDEX idx_synonyms_term ON public.search_synonyms USING btree (lower(term));

CREATE INDEX idx_user_profiles_email ON public.user_profiles USING btree (email);

CREATE UNIQUE INDEX idx_user_profiles_email_unique ON public.user_profiles USING btree (email) WHERE (email IS NOT NULL);

CREATE INDEX idx_user_profiles_is_active ON public.user_profiles USING btree (is_active);

CREATE INDEX idx_user_profiles_role ON public.user_profiles USING btree (role);

CREATE INDEX idx_user_profiles_school_borough ON public.user_profiles USING btree (school_borough);

CREATE INDEX idx_user_profiles_user_id ON public.user_profiles USING btree (user_id);

CREATE INDEX idx_versions_lesson_id ON public.lesson_versions USING btree (lesson_id);

CREATE INDEX idx_versions_submission ON public.lesson_versions USING btree (archived_from_submission_id);

CREATE UNIQUE INDEX lesson_archive_pkey ON public.lesson_archive USING btree (lesson_id);

CREATE UNIQUE INDEX lesson_collections_pkey ON public.lesson_collections USING btree (id);

CREATE UNIQUE INDEX lesson_versions_lesson_id_version_number_key ON public.lesson_versions USING btree (lesson_id, version_number);

CREATE UNIQUE INDEX lesson_versions_pkey ON public.lesson_versions USING btree (id);

CREATE UNIQUE INDEX lessons_lesson_id_key ON public.lessons USING btree (lesson_id);

CREATE UNIQUE INDEX saved_searches_pkey ON public.saved_searches USING btree (id);

CREATE UNIQUE INDEX search_synonyms_pkey ON public.search_synonyms USING btree (id);

CREATE UNIQUE INDEX submission_similarities_pkey ON public.submission_similarities USING btree (id);

CREATE UNIQUE INDEX user_profiles_user_id_key ON public.user_profiles USING btree (user_id);

CREATE INDEX idx_audit_login_actions ON public.user_management_audit USING btree (action, created_at) WHERE (action = 'login'::text);

CREATE INDEX idx_lessons_activity_type ON public.lessons USING btree (((metadata ->> 'activityType'::text)));

CREATE INDEX idx_lessons_location ON public.lessons USING btree (((metadata ->> 'locationRequirements'::text)));

CREATE INDEX idx_lessons_sel ON public.lessons USING gin (((metadata -> 'socialEmotionalLearning'::text)));

CREATE INDEX idx_lessons_themes ON public.lessons USING gin (((metadata -> 'thematicCategories'::text)));

CREATE UNIQUE INDEX unique_pending_invitation_per_email ON public.user_invitations USING btree (email) WHERE (accepted_at IS NULL);

alter table "public"."bookmarks" add constraint "bookmarks_pkey" PRIMARY KEY using index "bookmarks_pkey";

alter table "public"."canonical_lessons" add constraint "canonical_lessons_pkey" PRIMARY KEY using index "canonical_lessons_pkey";

alter table "public"."cultural_heritage_hierarchy" add constraint "cultural_heritage_hierarchy_pkey" PRIMARY KEY using index "cultural_heritage_hierarchy_pkey";

alter table "public"."lesson_archive" add constraint "lesson_archive_pkey" PRIMARY KEY using index "lesson_archive_pkey";

alter table "public"."lesson_collections" add constraint "lesson_collections_pkey" PRIMARY KEY using index "lesson_collections_pkey";

alter table "public"."lesson_versions" add constraint "lesson_versions_pkey" PRIMARY KEY using index "lesson_versions_pkey";

alter table "public"."saved_searches" add constraint "saved_searches_pkey" PRIMARY KEY using index "saved_searches_pkey";

alter table "public"."search_synonyms" add constraint "search_synonyms_pkey" PRIMARY KEY using index "search_synonyms_pkey";

alter table "public"."submission_similarities" add constraint "submission_similarities_pkey" PRIMARY KEY using index "submission_similarities_pkey";

alter table "public"."bookmarks" add constraint "bookmarks_lesson_id_fkey" FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id) ON DELETE CASCADE not valid;

alter table "public"."bookmarks" validate constraint "bookmarks_lesson_id_fkey";

alter table "public"."bookmarks" add constraint "bookmarks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."bookmarks" validate constraint "bookmarks_user_id_fkey";

alter table "public"."bookmarks" add constraint "bookmarks_user_id_lesson_id_key" UNIQUE using index "bookmarks_user_id_lesson_id_key";

alter table "public"."canonical_lessons" add constraint "canonical_lessons_canonical_id_fkey" FOREIGN KEY (canonical_id) REFERENCES lessons(lesson_id) not valid;

alter table "public"."canonical_lessons" validate constraint "canonical_lessons_canonical_id_fkey";

alter table "public"."canonical_lessons" add constraint "canonical_lessons_duplicate_id_fkey" FOREIGN KEY (duplicate_id) REFERENCES lessons(lesson_id) ON DELETE CASCADE not valid;

alter table "public"."canonical_lessons" validate constraint "canonical_lessons_duplicate_id_fkey";

alter table "public"."canonical_lessons" add constraint "canonical_lessons_resolution_type_check" CHECK ((resolution_type = ANY (ARRAY['exact'::text, 'near'::text, 'version'::text, 'title'::text]))) not valid;

alter table "public"."canonical_lessons" validate constraint "canonical_lessons_resolution_type_check";

alter table "public"."canonical_lessons" add constraint "canonical_lessons_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES auth.users(id) not valid;

alter table "public"."canonical_lessons" validate constraint "canonical_lessons_resolved_by_fkey";

alter table "public"."canonical_lessons" add constraint "canonical_lessons_similarity_score_check" CHECK (((similarity_score >= (0)::double precision) AND (similarity_score <= (1)::double precision))) not valid;

alter table "public"."canonical_lessons" validate constraint "canonical_lessons_similarity_score_check";

alter table "public"."canonical_lessons" add constraint "no_self_reference" CHECK ((duplicate_id <> canonical_id)) not valid;

alter table "public"."canonical_lessons" validate constraint "no_self_reference";

alter table "public"."duplicate_resolutions" add constraint "duplicate_resolutions_canonical_lesson_id_fkey" FOREIGN KEY (canonical_lesson_id) REFERENCES lessons(lesson_id) not valid;

alter table "public"."duplicate_resolutions" validate constraint "duplicate_resolutions_canonical_lesson_id_fkey";

alter table "public"."duplicate_resolutions" add constraint "duplicate_resolutions_resolution_mode_check" CHECK ((resolution_mode = ANY (ARRAY['single'::text, 'split'::text, 'keep_all'::text]))) not valid;

alter table "public"."duplicate_resolutions" validate constraint "duplicate_resolutions_resolution_mode_check";

alter table "public"."lesson_archive" add constraint "lesson_archive_archived_by_fkey" FOREIGN KEY (archived_by) REFERENCES auth.users(id) not valid;

alter table "public"."lesson_archive" validate constraint "lesson_archive_archived_by_fkey";

alter table "public"."lesson_archive" add constraint "lesson_archive_canonical_id_fkey" FOREIGN KEY (canonical_id) REFERENCES lessons(lesson_id) ON DELETE SET NULL not valid;

alter table "public"."lesson_archive" validate constraint "lesson_archive_canonical_id_fkey";

alter table "public"."lesson_collections" add constraint "lesson_collections_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."lesson_collections" validate constraint "lesson_collections_user_id_fkey";

alter table "public"."lesson_submissions" add constraint "lesson_submissions_original_lesson_id_fkey" FOREIGN KEY (original_lesson_id) REFERENCES lessons(lesson_id) not valid;

alter table "public"."lesson_submissions" validate constraint "lesson_submissions_original_lesson_id_fkey";

alter table "public"."lesson_submissions" add constraint "lesson_submissions_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) not valid;

alter table "public"."lesson_submissions" validate constraint "lesson_submissions_reviewed_by_fkey";

alter table "public"."lesson_submissions" add constraint "lesson_submissions_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES auth.users(id) not valid;

alter table "public"."lesson_submissions" validate constraint "lesson_submissions_reviewer_id_fkey";

alter table "public"."lesson_submissions" add constraint "lesson_submissions_submission_type_check" CHECK ((submission_type = ANY (ARRAY['new'::text, 'update'::text]))) not valid;

alter table "public"."lesson_submissions" validate constraint "lesson_submissions_submission_type_check";

alter table "public"."lesson_versions" add constraint "lesson_versions_archived_by_fkey" FOREIGN KEY (archived_by) REFERENCES auth.users(id) not valid;

alter table "public"."lesson_versions" validate constraint "lesson_versions_archived_by_fkey";

alter table "public"."lesson_versions" add constraint "lesson_versions_archived_from_submission_id_fkey" FOREIGN KEY (archived_from_submission_id) REFERENCES lesson_submissions(id) not valid;

alter table "public"."lesson_versions" validate constraint "lesson_versions_archived_from_submission_id_fkey";

alter table "public"."lesson_versions" add constraint "lesson_versions_lesson_id_version_number_key" UNIQUE using index "lesson_versions_lesson_id_version_number_key";

alter table "public"."lessons" add constraint "lessons_lesson_id_key" UNIQUE using index "lessons_lesson_id_key";

alter table "public"."saved_searches" add constraint "saved_searches_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."saved_searches" validate constraint "saved_searches_user_id_fkey";

alter table "public"."search_synonyms" add constraint "search_synonyms_synonym_type_check" CHECK ((synonym_type = ANY (ARRAY['bidirectional'::text, 'oneway'::text, 'typo_correction'::text]))) not valid;

alter table "public"."search_synonyms" validate constraint "search_synonyms_synonym_type_check";

alter table "public"."submission_reviews" add constraint "submission_reviews_decision_check" CHECK ((decision = ANY (ARRAY['approve_new'::text, 'approve_update'::text, 'reject'::text, 'needs_revision'::text]))) not valid;

alter table "public"."submission_reviews" validate constraint "submission_reviews_decision_check";

alter table "public"."submission_similarities" add constraint "submission_similarities_combined_score_check" CHECK (((combined_score >= (0)::double precision) AND (combined_score <= (1)::double precision))) not valid;

alter table "public"."submission_similarities" validate constraint "submission_similarities_combined_score_check";

alter table "public"."submission_similarities" add constraint "submission_similarities_content_similarity_check" CHECK (((content_similarity >= (0)::double precision) AND (content_similarity <= (1)::double precision))) not valid;

alter table "public"."submission_similarities" validate constraint "submission_similarities_content_similarity_check";

alter table "public"."submission_similarities" add constraint "submission_similarities_match_type_check" CHECK ((match_type = ANY (ARRAY['exact'::text, 'high'::text, 'medium'::text, 'low'::text]))) not valid;

alter table "public"."submission_similarities" validate constraint "submission_similarities_match_type_check";

alter table "public"."submission_similarities" add constraint "submission_similarities_metadata_overlap_score_check" CHECK (((metadata_overlap_score >= (0)::double precision) AND (metadata_overlap_score <= (1)::double precision))) not valid;

alter table "public"."submission_similarities" validate constraint "submission_similarities_metadata_overlap_score_check";

alter table "public"."submission_similarities" add constraint "submission_similarities_submission_id_fkey" FOREIGN KEY (submission_id) REFERENCES lesson_submissions(id) not valid;

alter table "public"."submission_similarities" validate constraint "submission_similarities_submission_id_fkey";

alter table "public"."submission_similarities" add constraint "submission_similarities_title_similarity_check" CHECK (((title_similarity >= (0)::double precision) AND (title_similarity <= (1)::double precision))) not valid;

alter table "public"."submission_similarities" validate constraint "submission_similarities_title_similarity_check";

alter table "public"."user_invitations" add constraint "user_invitations_school_borough_check" CHECK ((school_borough = ANY (ARRAY['Manhattan'::text, 'Brooklyn'::text, 'Queens'::text, 'Bronx'::text, 'Staten Island'::text]))) not valid;

alter table "public"."user_invitations" validate constraint "user_invitations_school_borough_check";

alter table "public"."user_management_audit" add constraint "user_management_audit_action_check" CHECK ((action = ANY (ARRAY['invite_sent'::text, 'invite_accepted'::text, 'invite_cancelled'::text, 'invite_resent'::text, 'user_role_changed'::text, 'user_activated'::text, 'user_deactivated'::text, 'user_deleted'::text, 'user_profile_updated'::text, 'permissions_changed'::text]))) not valid;

alter table "public"."user_management_audit" validate constraint "user_management_audit_action_check";

alter table "public"."user_profiles" add constraint "user_profiles_school_borough_check" CHECK ((school_borough = ANY (ARRAY['Manhattan'::text, 'Brooklyn'::text, 'Queens'::text, 'Bronx'::text, 'Staten Island'::text]))) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_school_borough_check";

alter table "public"."user_profiles" add constraint "user_profiles_user_id_key" UNIQUE using index "user_profiles_user_id_key";

alter table "public"."duplicate_resolutions" add constraint "duplicate_resolutions_action_taken_check" CHECK ((action_taken = ANY (ARRAY['merge_metadata'::text, 'archive_only'::text, 'merge_and_archive'::text]))) not valid;

alter table "public"."duplicate_resolutions" validate constraint "duplicate_resolutions_action_taken_check";

alter table "public"."lesson_submissions" add constraint "lesson_submissions_status_check" CHECK ((status = ANY (ARRAY['submitted'::text, 'in_review'::text, 'needs_revision'::text, 'approved'::text]))) not valid;

alter table "public"."lesson_submissions" validate constraint "lesson_submissions_status_check";

alter table "public"."submission_reviews" add constraint "submission_reviews_submission_id_fkey" FOREIGN KEY (submission_id) REFERENCES lesson_submissions(id) not valid;

alter table "public"."submission_reviews" validate constraint "submission_reviews_submission_id_fkey";

alter table "public"."user_management_audit" add constraint "user_management_audit_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."user_management_audit" validate constraint "user_management_audit_actor_id_fkey";

alter table "public"."user_management_audit" add constraint "user_management_audit_target_user_id_fkey" FOREIGN KEY (target_user_id) REFERENCES user_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_management_audit" validate constraint "user_management_audit_target_user_id_fkey";

alter table "public"."user_profiles" add constraint "user_profiles_role_check" CHECK ((role = ANY (ARRAY['teacher'::text, 'reviewer'::text, 'admin'::text]))) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_role_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.debug_user_email(user_id uuid)
 RETURNS TABLE(source text, id uuid, email text, details jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check auth.users
  RETURN QUERY
  SELECT 
    'auth.users'::text as source,
    u.id,
    u.email::text,
    jsonb_build_object(
      'created_at', u.created_at,
      'email_confirmed_at', u.email_confirmed_at,
      'raw_user_meta_data', u.raw_user_meta_data
    ) as details
  FROM auth.users u
  WHERE u.id = user_id;

  -- Check user_profiles
  RETURN QUERY
  SELECT 
    'user_profiles'::text as source,
    p.id,
    p.email::text,
    jsonb_build_object(
      'full_name', p.full_name,
      'role', p.role,
      'created_at', p.created_at,
      'updated_at', p.updated_at
    ) as details
  FROM user_profiles p
  WHERE p.id = user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.expand_cultural_heritage(cultures text[])
 RETURNS text[]
 LANGUAGE plpgsql
AS $function$
DECLARE
    expanded TEXT[] := cultures;
    hierarchy_record RECORD;
BEGIN
    -- Add child cultures for any parent cultures selected
    FOR hierarchy_record IN 
        SELECT * FROM cultural_heritage_hierarchy 
        WHERE parent = ANY(cultures)
    LOOP
        expanded := expanded || hierarchy_record.children;
    END LOOP;
    
    -- Remove duplicates
    RETURN ARRAY(SELECT DISTINCT unnest(expanded));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.expand_search_with_synonyms(query_text text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    words TEXT[];
    expanded_words TEXT[] := '{}';
    word TEXT;
    synonym_record RECORD;
    final_query TEXT;
BEGIN
    -- Handle empty query
    IF query_text IS NULL OR query_text = '' THEN
        RETURN NULL;
    END IF;
    
    -- Split query into words
    words := string_to_array(lower(trim(query_text)), ' ');
    
    FOREACH word IN ARRAY words LOOP
        -- Skip empty words
        CONTINUE WHEN word = '';
        
        -- Add original word
        expanded_words := array_append(expanded_words, word);
        
        -- Find synonyms
        FOR synonym_record IN 
            SELECT * FROM search_synonyms 
            WHERE (lower(term) = word AND synonym_type IN ('bidirectional', 'oneway', 'typo_correction'))
               OR (word = ANY(array(SELECT lower(unnest(synonyms)))) AND synonym_type = 'bidirectional')
        LOOP
            IF synonym_record.synonym_type = 'bidirectional' THEN
                -- Add all synonyms and the term
                expanded_words := expanded_words || array(SELECT lower(unnest(synonym_record.synonyms)));
                IF lower(synonym_record.term) != word THEN
                    expanded_words := array_append(expanded_words, lower(synonym_record.term));
                END IF;
            ELSIF synonym_record.synonym_type IN ('oneway', 'typo_correction') THEN
                -- Only add synonyms if term matches
                IF lower(synonym_record.term) = word THEN
                    expanded_words := expanded_words || array(SELECT lower(unnest(synonym_record.synonyms)));
                END IF;
            END IF;
        END LOOP;
    END LOOP;
    
    -- Remove duplicates and create OR query
    SELECT string_agg(DISTINCT unnest, ' | ') INTO final_query FROM unnest(expanded_words);
    
    RETURN final_query;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.find_lessons_by_hash(hash_value character varying)
 RETURNS TABLE(lesson_id text, title text, match_type text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    l.lesson_id,
    l.title,
    'exact'::TEXT as match_type
  FROM lessons l
  WHERE l.content_hash = hash_value;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.find_similar_lessons_by_embedding(query_embedding vector, similarity_threshold double precision DEFAULT 0.5, max_results integer DEFAULT 10)
 RETURNS TABLE(lesson_id text, title text, similarity_score double precision, match_type text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    l.lesson_id,
    l.title,
    1 - (l.content_embedding <=> query_embedding) as similarity_score,
    CASE 
      WHEN 1 - (l.content_embedding <=> query_embedding) >= 0.95 THEN 'exact'
      WHEN 1 - (l.content_embedding <=> query_embedding) >= 0.85 THEN 'high'
      WHEN 1 - (l.content_embedding <=> query_embedding) >= 0.70 THEN 'medium'
      ELSE 'low'
    END as match_type
  FROM lessons l
  WHERE l.content_embedding IS NOT NULL
    AND 1 - (l.content_embedding <=> query_embedding) >= similarity_threshold
  ORDER BY l.content_embedding <=> query_embedding
  LIMIT max_results;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_lesson_search_vector(p_title text, p_summary text, p_main_ingredients text[], p_garden_skills text[], p_cooking_skills text[], p_thematic_categories text[], p_cultural_heritage text[], p_observances_holidays text[], p_tags text[], p_content_text text)
 RETURNS tsvector
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  RETURN 
    setweight(to_tsvector('english', COALESCE(p_title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(p_summary, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(p_main_ingredients, ' '), '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(p_observances_holidays, ' '), '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(p_tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', 
      COALESCE(array_to_string(p_garden_skills, ' '), '') || ' ' ||
      COALESCE(array_to_string(p_cooking_skills, ' '), '') || ' ' ||
      COALESCE(array_to_string(p_thematic_categories, ' '), '') || ' ' ||
      COALESCE(array_to_string(p_cultural_heritage, ' '), '')
    ), 'C') ||
    setweight(to_tsvector('english', COALESCE(p_content_text, '')), 'D');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_canonical_lesson_id(p_lesson_id text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_canonical_id TEXT;
BEGIN
  -- Check if this lesson is marked as a duplicate
  SELECT canonical_id INTO v_canonical_id
  FROM canonical_lessons
  WHERE duplicate_id = p_lesson_id;
  
  -- If found, return the canonical ID
  IF v_canonical_id IS NOT NULL THEN
    RETURN v_canonical_id;
  END IF;
  
  -- Otherwise, the lesson itself is canonical
  RETURN p_lesson_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_activity_metrics(p_user_id uuid, p_days integer DEFAULT 30)
 RETURNS TABLE(login_count integer, last_login timestamp with time zone, submission_count integer, review_count integer, last_activity timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    -- Login count in the period
    (SELECT COUNT(*)::INTEGER 
     FROM user_management_audit 
     WHERE actor_id = p_user_id 
     AND action = 'login' 
     AND created_at >= NOW() - INTERVAL '1 day' * p_days) AS login_count,
    
    -- Last login time
    (SELECT MAX(created_at) 
     FROM user_management_audit 
     WHERE actor_id = p_user_id 
     AND action = 'login') AS last_login,
    
    -- Submission count
    (SELECT COUNT(*)::INTEGER 
     FROM lesson_submissions 
     WHERE teacher_id = p_user_id 
     AND created_at >= NOW() - INTERVAL '1 day' * p_days) AS submission_count,
    
    -- Review count
    (SELECT COUNT(*)::INTEGER 
     FROM lesson_reviews 
     WHERE reviewer_id = p_user_id 
     AND created_at >= NOW() - INTERVAL '1 day' * p_days) AS review_count,
    
    -- Last activity (most recent of any action)
    GREATEST(
      (SELECT MAX(created_at) FROM user_management_audit WHERE actor_id = p_user_id),
      (SELECT MAX(created_at) FROM lesson_submissions WHERE teacher_id = p_user_id),
      (SELECT MAX(created_at) FROM lesson_reviews WHERE reviewer_id = p_user_id)
    ) AS last_activity;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_lessons_metadata_write()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO lessons (
      lesson_id, title, summary, file_link, grade_levels,
      metadata, confidence, 
      thematic_categories, season_timing, core_competencies,
      cultural_heritage, location_requirements, lesson_format,
      main_ingredients, garden_skills, cooking_skills,
      cooking_methods, observances_holidays, academic_integration,
      social_emotional_learning, cultural_responsiveness_features,
      processing_notes, review_notes, flagged_for_review, tags
    ) VALUES (
      NEW.lesson_id, NEW.title, NEW.summary, NEW.file_link, NEW.grade_levels,
      NEW.metadata, NEW.confidence,
      -- Extract from metadata if provided
      COALESCE((NEW.metadata->>'thematicCategories')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'seasonTiming')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'coreCompetencies')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'culturalHeritage')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'locationRequirements')::text[], ARRAY[]::text[]),
      NEW.metadata->>'lessonFormat',
      COALESCE((NEW.metadata->>'mainIngredients')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'gardenSkills')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'cookingSkills')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'cookingMethods')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'observancesHolidays')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'academicIntegration')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'socialEmotionalLearning')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'culturalResponsivenessFeatures')::text[], ARRAY[]::text[]),
      NEW.processing_notes, NEW.review_notes, NEW.flagged_for_review, NEW.tags
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE lessons SET
      title = NEW.title,
      summary = NEW.summary,
      file_link = NEW.file_link,
      grade_levels = NEW.grade_levels,
      metadata = NEW.metadata,
      confidence = NEW.confidence,
      -- Update granular columns from metadata
      thematic_categories = COALESCE((NEW.metadata->>'thematicCategories')::text[], thematic_categories),
      season_timing = COALESCE((NEW.metadata->>'seasonTiming')::text[], season_timing),
      core_competencies = COALESCE((NEW.metadata->>'coreCompetencies')::text[], core_competencies),
      cultural_heritage = COALESCE((NEW.metadata->>'culturalHeritage')::text[], cultural_heritage),
      location_requirements = COALESCE((NEW.metadata->>'locationRequirements')::text[], location_requirements),
      lesson_format = COALESCE(NEW.metadata->>'lessonFormat', lesson_format),
      main_ingredients = COALESCE((NEW.metadata->>'mainIngredients')::text[], main_ingredients),
      garden_skills = COALESCE((NEW.metadata->>'gardenSkills')::text[], garden_skills),
      cooking_skills = COALESCE((NEW.metadata->>'cookingSkills')::text[], cooking_skills),
      cooking_methods = COALESCE((NEW.metadata->>'cookingMethods')::text[], cooking_methods),
      observances_holidays = COALESCE((NEW.metadata->>'observancesHolidays')::text[], observances_holidays),
      academic_integration = COALESCE((NEW.metadata->>'academicIntegration')::text[], academic_integration),
      social_emotional_learning = COALESCE((NEW.metadata->>'socialEmotionalLearning')::text[], social_emotional_learning),
      cultural_responsiveness_features = COALESCE((NEW.metadata->>'culturalResponsivenessFeatures')::text[], cultural_responsiveness_features),
      processing_notes = NEW.processing_notes,
      review_notes = NEW.review_notes,
      flagged_for_review = NEW.flagged_for_review,
      tags = NEW.tags,
      updated_at = NOW()
    WHERE lesson_id = NEW.lesson_id;
    RETURN NEW;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_role TEXT;
  user_active BOOLEAN;
BEGIN
  -- Get role directly without triggering RLS
  SELECT role, is_active INTO user_role, user_active
  FROM user_profiles
  WHERE id = auth.uid();
  
  RETURN user_role IN ('admin', 'super_admin') AND COALESCE(user_active, true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_duplicate_lesson(p_lesson_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM canonical_lessons 
    WHERE duplicate_id = p_lesson_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_lesson_archived(p_lesson_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM lesson_archive 
    WHERE lesson_id = p_lesson_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_reviewer_or_above()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_role TEXT;
  user_active BOOLEAN;
BEGIN
  SELECT role, is_active INTO user_role, user_active
  FROM user_profiles
  WHERE id = auth.uid();
  
  RETURN user_role IN ('reviewer', 'admin', 'super_admin') AND COALESCE(user_active, true);
END;
$function$
;

create or replace view "public"."lessons_with_metadata" as  SELECT id,
    lesson_id,
    title,
    summary,
    file_link,
    grade_levels,
    metadata,
    confidence,
    search_vector,
    created_at,
    updated_at,
    content_text,
    content_embedding,
    content_hash,
    canonical_id,
    version_number,
    has_versions,
    original_submission_id,
    last_modified,
    thematic_categories,
    cultural_heritage,
    observances_holidays,
    location_requirements,
    season_timing,
    academic_integration,
    social_emotional_learning,
    cooking_methods,
    main_ingredients,
    cultural_responsiveness_features,
    garden_skills,
    cooking_skills,
    core_competencies,
    lesson_format,
    processing_notes,
    review_notes,
    flagged_for_review,
    tags,
    (metadata ->> 'activity_type'::text) AS activity_type_meta,
    (metadata ->> 'location'::text) AS location_meta,
    (metadata ->> 'season'::text) AS season_meta,
    (metadata ->> 'timing'::text) AS timing_meta,
    (metadata ->> 'group_size'::text) AS group_size_meta,
    (metadata ->> 'duration_minutes'::text) AS duration_minutes_meta,
    (metadata ->> 'prep_time_minutes'::text) AS prep_time_minutes_meta,
    ((metadata ->> 'grade_levels'::text))::jsonb AS grade_levels_array,
    ((metadata ->> 'themes'::text))::jsonb AS themes_array,
    ((metadata ->> 'core_competencies'::text))::jsonb AS core_competencies_array,
    ((metadata ->> 'cultural_heritage'::text))::jsonb AS cultural_heritage_array,
    ((metadata ->> 'academic_integration'::text))::jsonb AS academic_integration_array,
    ((metadata ->> 'sel_competencies'::text))::jsonb AS sel_competencies_array,
    ((metadata ->> 'observances'::text))::jsonb AS observances_array,
    ((metadata ->> 'main_ingredients'::text))::jsonb AS main_ingredients_array,
    ((metadata ->> 'garden_skills'::text))::jsonb AS garden_skills_array,
    ((metadata ->> 'cooking_skills'::text))::jsonb AS cooking_skills_array,
    ((metadata ->> 'materials'::text))::jsonb AS materials_array
   FROM lessons l;


CREATE OR REPLACE FUNCTION public.log_user_profile_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Only log if there are actual changes
  IF OLD IS DISTINCT FROM NEW THEN
    INSERT INTO user_management_audit (
      actor_id,
      action,
      target_user_id,
      old_values,
      new_values,
      created_at
    ) VALUES (
      COALESCE(auth.uid(), NEW.id), -- Use the authenticated user or the user being created
      'user_profile_updated',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.publish_approved_submissions(p_limit integer DEFAULT NULL::integer)
 RETURNS TABLE(published_lesson_id text, published_submission_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT 
      a.id AS submission_id,
      a.google_doc_url,
      a.extracted_content,
      a.extracted_title,
      a.content_hash,
      a.content_embedding,
      (
        SELECT sr.tagged_metadata
        FROM submission_reviews sr
        WHERE sr.submission_id = a.id
        ORDER BY sr.created_at DESC
        LIMIT 1
      ) AS meta
    FROM lesson_submissions a
    LEFT JOIN lessons l ON l.original_submission_id = a.id
    WHERE a.status='approved' AND l.lesson_id IS NULL
    ORDER BY a.created_at DESC
    LIMIT COALESCE(p_limit, 1000000)
  ), title_fallback AS (
    SELECT 
      c.*,
      COALESCE(
        NULLIF(c.extracted_title, ''),
        NULLIF(c.meta->>'title',''),
        (
          SELECT ln
          FROM (
            SELECT btrim(x) AS ln
            FROM regexp_split_to_table(c.extracted_content, E'\r?\n') AS x
          ) t
          WHERE ln <> ''
            AND ln <> '---'
            AND ln !~ '^\[.*\]'
            AND ln !~* '^summary\s*:'
          LIMIT 1
        )
      ) AS derived_title,
      COALESCE(c.meta->>'summary','') AS derived_summary
    FROM candidates c
  ), ins AS (
    INSERT INTO lessons (
      lesson_id,
      title,
      summary,
      file_link,
      grade_levels,
      activity_type,
      thematic_categories,
      season_timing,
      core_competencies,
      cultural_heritage,
      location_requirements,
      lesson_format,
      academic_integration,
      social_emotional_learning,
      cooking_methods,
      main_ingredients,
      garden_skills,
      cooking_skills,
      observances_holidays,
      cultural_responsiveness_features,
      metadata,
      content_text,
      content_hash,
      original_submission_id,
      content_embedding,
      created_at,
      updated_at
    )
    SELECT 
      'lesson_' || replace(gen_random_uuid()::text, '-', ''),
      COALESCE(tf.derived_title, 'Untitled Lesson'),
      tf.derived_summary,
      tf.google_doc_url,
      CASE 
        WHEN tf.meta ? 'gradeLevels' AND jsonb_typeof(tf.meta->'gradeLevels') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'gradeLevels'))
        WHEN tf.meta ? 'gradeLevels' THEN ARRAY[tf.meta->>'gradeLevels']
        ELSE ARRAY[]::text[]
      END,
      CASE WHEN tf.meta ? 'activityType' THEN ARRAY[tf.meta->>'activityType'] ELSE ARRAY[]::text[] END,
      CASE 
        WHEN tf.meta ? 'themes' AND jsonb_typeof(tf.meta->'themes') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'themes'))
        WHEN tf.meta ? 'themes' THEN ARRAY[tf.meta->>'themes']
        ELSE ARRAY[]::text[]
      END,
      CASE
        WHEN tf.meta ? 'season' AND jsonb_typeof(tf.meta->'season') = 'array' THEN
          CASE
            WHEN EXISTS (
              SELECT 1 FROM jsonb_array_elements_text(tf.meta->'season') el
              WHERE lower(trim(el)) IN ('year-round','all year','all-year')
            ) THEN ARRAY['Fall','Winter','Spring','Summer']::text[]
            ELSE ARRAY(
              SELECT DISTINCT
                CASE lower(trim(el2))
                  WHEN 'autumn' THEN 'Fall'
                  WHEN 'fall' THEN 'Fall'
                  WHEN 'winter' THEN 'Winter'
                  WHEN 'spring' THEN 'Spring'
                  WHEN 'summer' THEN 'Summer'
                END
              FROM jsonb_array_elements_text(tf.meta->'season') el2
              WHERE lower(trim(el2)) IN ('autumn','fall','winter','spring','summer')
            )
          END
        WHEN tf.meta ? 'season' THEN
          CASE lower(trim(tf.meta->>'season'))
            WHEN 'year-round' THEN ARRAY['Fall','Winter','Spring','Summer']::text[]
            WHEN 'all year'  THEN ARRAY['Fall','Winter','Spring','Summer']::text[]
            WHEN 'all-year'  THEN ARRAY['Fall','Winter','Spring','Summer']::text[]
            WHEN 'autumn'    THEN ARRAY['Fall']::text[]
            WHEN 'fall'      THEN ARRAY['Fall']::text[]
            WHEN 'winter'    THEN ARRAY['Winter']::text[]
            WHEN 'spring'    THEN ARRAY['Spring']::text[]
            WHEN 'summer'    THEN ARRAY['Summer']::text[]
            ELSE ARRAY[]::text[]
          END
        ELSE ARRAY[]::text[]
      END,
      CASE 
        WHEN tf.meta ? 'coreCompetencies' AND jsonb_typeof(tf.meta->'coreCompetencies') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'coreCompetencies'))
        WHEN tf.meta ? 'coreCompetencies' THEN ARRAY[tf.meta->>'coreCompetencies']
        ELSE ARRAY[]::text[]
      END,
      CASE 
        WHEN tf.meta ? 'culturalHeritage' AND jsonb_typeof(tf.meta->'culturalHeritage') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'culturalHeritage'))
        WHEN tf.meta ? 'culturalHeritage' THEN ARRAY[tf.meta->>'culturalHeritage']
        ELSE ARRAY[]::text[]
      END,
      CASE WHEN tf.meta ? 'location' THEN ARRAY[tf.meta->>'location'] ELSE ARRAY[]::text[] END,
      NULLIF(tf.meta->>'lessonFormat',''),
      CASE 
        WHEN tf.meta ? 'academicIntegration' AND jsonb_typeof(tf.meta->'academicIntegration') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'academicIntegration'))
        WHEN tf.meta ? 'academicIntegration' THEN ARRAY[tf.meta->>'academicIntegration']
        ELSE ARRAY[]::text[]
      END,
      CASE 
        WHEN tf.meta ? 'socialEmotionalLearning' AND jsonb_typeof(tf.meta->'socialEmotionalLearning') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'socialEmotionalLearning'))
        WHEN tf.meta ? 'socialEmotionalLearning' THEN ARRAY[tf.meta->>'socialEmotionalLearning']
        ELSE ARRAY[]::text[]
      END,
      CASE 
        WHEN tf.meta ? 'cookingMethods' AND jsonb_typeof(tf.meta->'cookingMethods') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'cookingMethods'))
        WHEN tf.meta ? 'cookingMethods' THEN ARRAY[tf.meta->>'cookingMethods']
        ELSE ARRAY[]::text[]
      END,
      CASE 
        WHEN tf.meta ? 'mainIngredients' AND jsonb_typeof(tf.meta->'mainIngredients') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'mainIngredients'))
        WHEN tf.meta ? 'mainIngredients' THEN ARRAY[tf.meta->>'mainIngredients']
        ELSE ARRAY[]::text[]
      END,
      CASE 
        WHEN tf.meta ? 'gardenSkills' AND jsonb_typeof(tf.meta->'gardenSkills') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'gardenSkills'))
        WHEN tf.meta ? 'gardenSkills' THEN ARRAY[tf.meta->>'gardenSkills']
        ELSE ARRAY[]::text[]
      END,
      CASE 
        WHEN tf.meta ? 'cookingSkills' AND jsonb_typeof(tf.meta->'cookingSkills') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'cookingSkills'))
        WHEN tf.meta ? 'cookingSkills' THEN ARRAY[tf.meta->>'cookingSkills']
        ELSE ARRAY[]::text[]
      END,
      CASE 
        WHEN tf.meta ? 'observancesHolidays' AND jsonb_typeof(tf.meta->'observancesHolidays') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'observancesHolidays'))
        WHEN tf.meta ? 'observancesHolidays' THEN ARRAY[tf.meta->>'observancesHolidays']
        ELSE ARRAY[]::text[]
      END,
      CASE 
        WHEN tf.meta ? 'culturalResponsivenessFeatures' AND jsonb_typeof(tf.meta->'culturalResponsivenessFeatures') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'culturalResponsivenessFeatures'))
        WHEN tf.meta ? 'culturalResponsivenessFeatures' THEN ARRAY[tf.meta->>'culturalResponsivenessFeatures']
        ELSE ARRAY[]::text[]
      END,
      COALESCE(tf.meta, '{}'::jsonb),
      COALESCE(tf.extracted_content, ''),
      tf.content_hash,
      tf.submission_id,
      tf.content_embedding,
      NOW(),
      NOW()
    FROM title_fallback tf
    RETURNING lesson_id, original_submission_id
  )
  SELECT ins.lesson_id AS published_lesson_id, ins.original_submission_id::uuid AS published_submission_id
  FROM ins;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.search_lessons(search_query text DEFAULT NULL::text, filter_grade_levels text[] DEFAULT NULL::text[], filter_themes text[] DEFAULT NULL::text[], filter_seasons text[] DEFAULT NULL::text[], filter_competencies text[] DEFAULT NULL::text[], filter_cultures text[] DEFAULT NULL::text[], filter_location text[] DEFAULT NULL::text[], filter_activity_type text[] DEFAULT NULL::text[], filter_lesson_format text DEFAULT NULL::text, filter_academic text[] DEFAULT NULL::text[], filter_sel text[] DEFAULT NULL::text[], filter_cooking_method text DEFAULT NULL::text, page_size integer DEFAULT 20, page_offset integer DEFAULT 0)
 RETURNS TABLE(lesson_id text, title text, summary text, file_link text, grade_levels text[], metadata jsonb, confidence jsonb, rank double precision, total_count bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    expanded_query TEXT;
    expanded_cultures TEXT[];
    total_results BIGINT;
BEGIN
    -- Expand query with synonyms
    IF search_query IS NOT NULL AND search_query != '' THEN
        expanded_query := expand_search_with_synonyms(search_query);
    ELSE
        expanded_query := NULL;
    END IF;
    
    -- Expand cultural heritage if needed
    IF filter_cultures IS NOT NULL AND array_length(filter_cultures, 1) > 0 THEN
        expanded_cultures := expand_cultural_heritage(filter_cultures);
    ELSE
        expanded_cultures := NULL;
    END IF;
    
    -- Count total results first
    SELECT COUNT(*) INTO total_results
    FROM lessons l
    WHERE 
        -- Text search: only apply if search_query is provided
        (search_query IS NULL OR search_query = '' OR (
            l.search_vector @@ to_tsquery('english', expanded_query) OR
            l.title % search_query OR 
            l.summary % search_query
        ))
        -- Grade levels filter: only apply if filter is provided
        AND (filter_grade_levels IS NULL OR array_length(filter_grade_levels, 1) IS NULL OR 
             l.grade_levels && filter_grade_levels)
        -- Thematic categories filter
        AND (filter_themes IS NULL OR array_length(filter_themes, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'thematicCategories') t 
                     WHERE t = ANY(filter_themes)))
        -- Season filter
        AND (filter_seasons IS NULL OR array_length(filter_seasons, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'seasonTiming') s 
                     WHERE s = ANY(filter_seasons)))
        -- Core competencies filter
        AND (filter_competencies IS NULL OR array_length(filter_competencies, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'coreCompetencies') c 
                     WHERE c = ANY(filter_competencies)))
        -- Cultural heritage filter (with hierarchy expansion)
        AND (expanded_cultures IS NULL OR array_length(expanded_cultures, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'culturalHeritage') c 
                     WHERE c = ANY(expanded_cultures)))
        -- Location filter - FIX: Handle location stored as JSON array string
        AND (filter_location IS NULL OR array_length(filter_location, 1) IS NULL OR
             EXISTS (
                 SELECT 1 
                 FROM jsonb_array_elements_text(
                     CASE 
                         WHEN jsonb_typeof(l.metadata->'locationRequirements') = 'string' 
                         THEN (l.metadata->>'locationRequirements')::jsonb
                         ELSE l.metadata->'locationRequirements'
                     END
                 ) loc 
                 WHERE loc = ANY(filter_location)
             ))
        -- Activity type filter
        AND (filter_activity_type IS NULL OR array_length(filter_activity_type, 1) IS NULL OR
             l.metadata->>'activityType' = ANY(filter_activity_type))
        -- Lesson format filter
        AND (filter_lesson_format IS NULL OR filter_lesson_format = '' OR
             l.metadata->>'lessonFormat' = filter_lesson_format)
        -- Academic integration filter
        AND (filter_academic IS NULL OR array_length(filter_academic, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'academicIntegration'->'selected') a 
                     WHERE a = ANY(filter_academic)))
        -- SEL filter
        AND (filter_sel IS NULL OR array_length(filter_sel, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'socialEmotionalLearning') s 
                     WHERE s = ANY(filter_sel)))
        -- Cooking method filter
        AND (filter_cooking_method IS NULL OR filter_cooking_method = '' OR
             l.metadata->>'cookingMethods' = filter_cooking_method);
    
    -- Return results with pagination
    RETURN QUERY
    SELECT 
        l.lesson_id,
        l.title,
        l.summary,
        l.file_link,
        l.grade_levels,
        l.metadata,
        l.confidence,
        CASE 
            WHEN search_query IS NOT NULL AND search_query != '' THEN
                GREATEST(
                    COALESCE(ts_rank(l.search_vector, to_tsquery('english', expanded_query)), 0),
                    COALESCE(similarity(l.title, search_query), 0),
                    COALESCE(similarity(l.summary, search_query), 0) * 0.8
                )::double precision
            ELSE 0::double precision
        END as rank,
        total_results
    FROM lessons l
    WHERE 
        -- Same WHERE conditions as count query
        (search_query IS NULL OR search_query = '' OR (
            l.search_vector @@ to_tsquery('english', expanded_query) OR
            l.title % search_query OR 
            l.summary % search_query
        ))
        AND (filter_grade_levels IS NULL OR array_length(filter_grade_levels, 1) IS NULL OR 
             l.grade_levels && filter_grade_levels)
        AND (filter_themes IS NULL OR array_length(filter_themes, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'thematicCategories') t 
                     WHERE t = ANY(filter_themes)))
        AND (filter_seasons IS NULL OR array_length(filter_seasons, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'seasonTiming') s 
                     WHERE s = ANY(filter_seasons)))
        AND (filter_competencies IS NULL OR array_length(filter_competencies, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'coreCompetencies') c 
                     WHERE c = ANY(filter_competencies)))
        AND (expanded_cultures IS NULL OR array_length(expanded_cultures, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'culturalHeritage') c 
                     WHERE c = ANY(expanded_cultures)))
        -- Location filter - FIX: Handle location stored as JSON array string
        AND (filter_location IS NULL OR array_length(filter_location, 1) IS NULL OR
             EXISTS (
                 SELECT 1 
                 FROM jsonb_array_elements_text(
                     CASE 
                         WHEN jsonb_typeof(l.metadata->'locationRequirements') = 'string' 
                         THEN (l.metadata->>'locationRequirements')::jsonb
                         ELSE l.metadata->'locationRequirements'
                     END
                 ) loc 
                 WHERE loc = ANY(filter_location)
             ))
        AND (filter_activity_type IS NULL OR array_length(filter_activity_type, 1) IS NULL OR
             l.metadata->>'activityType' = ANY(filter_activity_type))
        AND (filter_lesson_format IS NULL OR filter_lesson_format = '' OR
             l.metadata->>'lessonFormat' = filter_lesson_format)
        AND (filter_academic IS NULL OR array_length(filter_academic, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'academicIntegration'->'selected') a 
                     WHERE a = ANY(filter_academic)))
        AND (filter_sel IS NULL OR array_length(filter_sel, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'socialEmotionalLearning') s 
                     WHERE s = ANY(filter_sel)))
        AND (filter_cooking_method IS NULL OR filter_cooking_method = '' OR
             l.metadata->>'cookingMethods' = filter_cooking_method)
    ORDER BY 
        rank DESC,
        COALESCE((l.confidence->>'overall')::float, 0) DESC,
        l.title ASC
    LIMIT page_size
    OFFSET page_offset;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_lesson_submissions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.summary, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.metadata->>'mainIngredients', '') || ' ' || 
                                         COALESCE(NEW.metadata->>'skills', '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.metadata->>'thematicCategories', '') || ' ' || 
                                         COALESCE(NEW.metadata->>'culturalHeritage', '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.content_text, '')), 'D');
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_invitation_token(invite_token text)
 RETURNS TABLE(id uuid, email text, role text, school_name text, school_borough text, metadata jsonb, is_valid boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.email,
    i.role,
    i.school_name,
    i.school_borough,
    i.metadata,
    (i.accepted_at IS NULL AND i.expires_at > NOW()) AS is_valid
  FROM user_invitations i
  WHERE i.token = invite_token;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_security_definer_views()
 RETURNS TABLE(view_name text, view_owner text, has_security_definer boolean)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT 
    schemaname || '.' || viewname as view_name,
    viewowner as view_owner,
    false as has_security_definer -- PostgreSQL doesn't easily expose this, would need pg_get_viewdef parsing
  FROM pg_views
  WHERE schemaname = 'public';
$function$
;

CREATE OR REPLACE FUNCTION public.get_embedding_as_text(lesson_id_param text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  result TEXT;
BEGIN
  SELECT content_embedding::text INTO result
  FROM lessons
  WHERE lesson_id = lesson_id_param;
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_emails(user_ids uuid[])
 RETURNS TABLE(id uuid, email character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only admins can access this function
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Return emails from auth.users first, then fallback to user_profiles
  RETURN QUERY
  SELECT DISTINCT ON (combined.id)
    combined.id,
    combined.email::varchar(255)
  FROM (
    -- Get emails from auth.users
    SELECT 
      u.id,
      u.email
    FROM auth.users u
    WHERE u.id = ANY(user_ids)
    
    UNION ALL
    
    -- Get emails from user_profiles as fallback
    SELECT 
      p.id,
      p.email
    FROM user_profiles p
    WHERE p.id = ANY(user_ids) AND p.email IS NOT NULL
  ) AS combined
  ORDER BY combined.id, 
    CASE 
      WHEN combined.email IS NOT NULL THEN 0 
      ELSE 1 
    END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_profiles_with_email()
 RETURNS TABLE(id uuid, user_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, email text, full_name text, role text, school_id uuid, school_name text, grades_taught text[], subjects text[], is_active boolean, invited_by uuid, invitation_accepted_at timestamp with time zone, last_login_at timestamp with time zone, login_count integer, auth_email text, auth_created_at timestamp with time zone, last_sign_in_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only admins can access this function
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    up.id,
    up.user_id,
    up.created_at,
    up.updated_at,
    up.email,
    up.full_name,
    up.role,
    up.school_id,
    up.school_name,
    up.grades_taught,
    up.subjects,
    up.is_active,
    up.invited_by,
    up.invitation_accepted_at,
    up.last_login_at,
    up.login_count,
    au.email as auth_email,
    au.created_at as auth_created_at,
    au.last_sign_in_at
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.id = au.id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(p_user_id uuid, required_role text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = p_user_id AND is_active = true;  -- Now using p_user_id to avoid ambiguity
  
  -- Role hierarchy: super_admin > admin > reviewer > teacher
  RETURN CASE
    WHEN required_role = 'teacher' THEN user_role IS NOT NULL
    WHEN required_role = 'reviewer' THEN user_role IN ('reviewer', 'admin', 'super_admin')
    WHEN required_role = 'admin' THEN user_role IN ('admin', 'super_admin')
    WHEN required_role = 'super_admin' THEN user_role = 'super_admin'
    ELSE false
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id
    AND role IN ('admin', 'super_admin')
    AND is_active = true
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_duplicate_group(p_group_id text, p_canonical_id text, p_duplicate_ids text[], p_duplicate_type text DEFAULT 'near'::text, p_similarity_score numeric DEFAULT 0.85, p_merge_metadata boolean DEFAULT false, p_resolution_notes text DEFAULT NULL::text, p_resolution_mode text DEFAULT 'single'::text, p_sub_group_name text DEFAULT NULL::text, p_parent_group_id text DEFAULT NULL::text, p_title_updates jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_resolution_id uuid;
  v_archived_count integer := 0;
  v_lesson_count integer;
  v_action_taken text;
  v_lesson_record record;
  v_archive_id uuid;
  v_title_update_key text;
  v_new_title text;
  v_old_title text;
  v_updated_titles jsonb := '[]'::jsonb;
  v_title_update_record jsonb;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  -- Verify user has permission
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = v_user_id 
    AND role IN ('admin', 'reviewer', 'super_admin')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient permissions'
    );
  END IF;

  -- Validate canonical lesson exists
  IF NOT EXISTS (SELECT 1 FROM lessons WHERE lesson_id = p_canonical_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Canonical lesson not found: ' || p_canonical_id
    );
  END IF;

  -- Validate all duplicate lessons exist
  IF p_duplicate_ids IS NOT NULL THEN
    FOR i IN 1..array_length(p_duplicate_ids, 1) LOOP
      IF NOT EXISTS (SELECT 1 FROM lessons WHERE lesson_id = p_duplicate_ids[i]) THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Duplicate lesson not found: ' || p_duplicate_ids[i]
        );
      END IF;
    END LOOP;
  END IF;
  
  -- Apply title updates if provided
  IF p_title_updates IS NOT NULL THEN
    FOR v_title_update_key IN SELECT jsonb_object_keys(p_title_updates)
    LOOP
      v_new_title := p_title_updates ->> v_title_update_key;
      
      -- Validate title is not empty and within reasonable length
      IF v_new_title IS NULL OR length(trim(v_new_title)) = 0 THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Invalid title for lesson ' || v_title_update_key || ': Title cannot be empty'
        );
      END IF;
      
      IF length(v_new_title) > 500 THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Invalid title for lesson ' || v_title_update_key || ': Title exceeds 500 characters'
        );
      END IF;
      
      -- Get the old title first
      SELECT title INTO v_old_title 
      FROM lessons 
      WHERE lesson_id = v_title_update_key;
      
      -- Update the title in the lessons table
      UPDATE lessons 
      SET 
        title = v_new_title,
        updated_at = now(),
        processing_notes = COALESCE(processing_notes, '') || 
          E'\n[' || now()::text || '] Title updated during duplicate resolution by user ' || v_user_id::text ||
          '. Original title: "' || COALESCE(v_old_title, 'unknown') || '"'
      WHERE lesson_id = v_title_update_key;
      
      -- Track the title update
      v_title_update_record := jsonb_build_object(
        'lesson_id', v_title_update_key,
        'old_title', v_old_title,
        'new_title', v_new_title
      );
      v_updated_titles := v_updated_titles || v_title_update_record;
    END LOOP;
  END IF;
  
  -- Calculate lessons in group
  v_lesson_count := 1;
  IF p_duplicate_ids IS NOT NULL THEN
    v_lesson_count := v_lesson_count + array_length(p_duplicate_ids, 1);
  END IF;

  -- Determine action taken
  v_action_taken := CASE
    WHEN p_resolution_mode = 'keep_all' THEN 'keep_all'
    WHEN p_resolution_mode = 'split' THEN 'split_group'
    WHEN p_merge_metadata THEN 'merge_and_archive'
    ELSE 'archive_only'
  END;
  
  -- Create resolution record with title updates tracked
  INSERT INTO duplicate_resolutions (
    group_id,
    canonical_lesson_id,
    duplicate_type,
    similarity_score,
    lessons_in_group,
    action_taken,
    notes,
    resolved_by,
    resolution_mode,
    sub_group_name,
    parent_group_id,
    metadata_merged
  ) VALUES (
    p_group_id,
    p_canonical_id,
    p_duplicate_type,
    p_similarity_score::double precision,
    v_lesson_count,
    v_action_taken,
    COALESCE(p_resolution_notes, '') || 
      CASE 
        WHEN jsonb_array_length(v_updated_titles) > 0 
        THEN E'\nTitle updates: ' || v_updated_titles::text
        ELSE ''
      END,
    v_user_id,
    COALESCE(p_resolution_mode, 'single'),
    p_sub_group_name,
    p_parent_group_id,
    NULL
  )
  RETURNING id INTO v_resolution_id;
  
  -- Process duplicates if not keeping all
  IF p_resolution_mode != 'keep_all' AND p_duplicate_ids IS NOT NULL AND array_length(p_duplicate_ids, 1) > 0 THEN
    
    -- Handle metadata merging
    IF p_merge_metadata THEN
      -- Merge array fields from all duplicates into canonical
      WITH merged_arrays AS (
        SELECT 
          array_agg(DISTINCT elem) FILTER (WHERE elem IS NOT NULL) as merged
        FROM (
          SELECT unnest(grade_levels) as elem FROM lessons WHERE lesson_id = p_canonical_id
          UNION
          SELECT unnest(grade_levels) FROM lessons WHERE lesson_id = ANY(p_duplicate_ids)
        ) t
      )
      UPDATE lessons 
      SET grade_levels = COALESCE((SELECT merged FROM merged_arrays), ARRAY[]::text[])
      WHERE lesson_id = p_canonical_id;

      -- Repeat for other array fields
      WITH merged_arrays AS (
        SELECT 
          array_agg(DISTINCT elem) FILTER (WHERE elem IS NOT NULL) as merged
        FROM (
          SELECT unnest(thematic_categories) as elem FROM lessons WHERE lesson_id = p_canonical_id
          UNION
          SELECT unnest(thematic_categories) FROM lessons WHERE lesson_id = ANY(p_duplicate_ids)
        ) t
      )
      UPDATE lessons 
      SET thematic_categories = COALESCE((SELECT merged FROM merged_arrays), ARRAY[]::text[])
      WHERE lesson_id = p_canonical_id;

      -- Continue for other arrays as needed...
    END IF;

    -- Archive each duplicate lesson
    FOR v_lesson_record IN 
      SELECT * FROM lessons WHERE lesson_id = ANY(p_duplicate_ids)
    LOOP
      -- Generate a new UUID for the archive record
      v_archive_id := gen_random_uuid();
      
      -- Insert into lesson_archive with ALL required fields
      INSERT INTO lesson_archive (
        id,
        lesson_id,
        title,
        summary,
        file_link,
        grade_levels,
        metadata,
        confidence,
        search_vector,
        content_text,
        content_embedding,
        content_hash,
        last_modified,
        created_at,
        updated_at,
        thematic_categories,
        cultural_heritage,
        observances_holidays,
        location_requirements,
        season_timing,
        academic_integration,
        social_emotional_learning,
        cooking_methods,
        main_ingredients,
        cultural_responsiveness_features,
        garden_skills,
        cooking_skills,
        core_competencies,
        lesson_format,
        processing_notes,
        review_notes,
        flagged_for_review,
        tags,
        archived_at,
        archived_by,
        archive_reason,
        canonical_id,
        activity_type
      ) VALUES (
        v_archive_id,
        v_lesson_record.lesson_id,
        v_lesson_record.title,  -- Original title preserved in archive
        COALESCE(v_lesson_record.summary, ''),
        COALESCE(v_lesson_record.file_link, ''),
        COALESCE(v_lesson_record.grade_levels, ARRAY[]::text[]),
        COALESCE(v_lesson_record.metadata, '{}'::jsonb),
        COALESCE(v_lesson_record.confidence, '{}'::jsonb),
        v_lesson_record.search_vector,
        v_lesson_record.content_text,
        v_lesson_record.content_embedding,
        v_lesson_record.content_hash,
        v_lesson_record.last_modified,
        COALESCE(v_lesson_record.created_at, now()),
        v_lesson_record.updated_at,
        v_lesson_record.thematic_categories,
        v_lesson_record.cultural_heritage,
        v_lesson_record.observances_holidays,
        v_lesson_record.location_requirements,
        v_lesson_record.season_timing,
        v_lesson_record.academic_integration,
        v_lesson_record.social_emotional_learning,
        v_lesson_record.cooking_methods,
        v_lesson_record.main_ingredients,
        v_lesson_record.cultural_responsiveness_features,
        v_lesson_record.garden_skills,
        v_lesson_record.cooking_skills,
        v_lesson_record.core_competencies,
        v_lesson_record.lesson_format,
        v_lesson_record.processing_notes,
        v_lesson_record.review_notes,
        v_lesson_record.flagged_for_review,
        v_lesson_record.tags,
        now(),
        v_user_id,
        'Duplicate resolution: ' || p_duplicate_type || ' duplicate of ' || p_canonical_id || 
          ' (group: ' || p_group_id || ')',
        p_canonical_id,
        v_lesson_record.activity_type
      );
      
      v_archived_count := v_archived_count + 1;
    END LOOP;
    
    -- Delete the duplicate lessons from main table
    -- Note: We don't insert into canonical_lessons because the foreign key constraint
    -- would prevent inserting references to lessons we're about to delete.
    -- The canonical_lessons table is meant for tracking already-deleted duplicates.
    DELETE FROM lessons WHERE lesson_id = ANY(p_duplicate_ids);
  END IF;
  
  -- Return success with details
  RETURN jsonb_build_object(
    'success', true,
    'resolution_id', v_resolution_id,
    'archived_count', v_archived_count,
    'canonical_id', p_canonical_id,
    'action_taken', v_action_taken,
    'title_updates', v_updated_titles
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.track_user_login(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO user_management_audit (
    actor_id,
    action,
    target_user_id,
    metadata
  ) VALUES (
    p_user_id,
    'login',
    p_user_id,
    jsonb_build_object(
      'login_at', NOW(),
      'source', 'manual_tracking'
    )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_lesson_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := generate_lesson_search_vector(
    NEW.title,
    NEW.summary,
    NEW.main_ingredients,
    NEW.garden_skills,
    NEW.cooking_skills,
    NEW.thematic_categories,
    NEW.cultural_heritage,
    NEW.observances_holidays,
    NEW.tags,
    NEW.content_text
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

create or replace view "public"."user_profiles_safe" as  SELECT id,
    full_name,
    role,
    school_name,
    grades_taught,
    subjects,
    created_at
   FROM user_profiles up
  WHERE (is_active = true);


CREATE OR REPLACE FUNCTION public.verify_rls_enabled()
 RETURNS TABLE(table_name text, rls_enabled boolean, policy_count integer, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH table_policies AS (
    SELECT 
      t.schemaname,
      t.tablename,
      t.rowsecurity,
      COUNT(pol.polname) as pol_count
    FROM pg_tables t
    LEFT JOIN pg_policies pol ON pol.schemaname = t.schemaname AND pol.tablename = t.tablename
    WHERE t.schemaname = 'public'
      AND t.tablename NOT IN ('schema_migrations', 'spatial_ref_sys')
    GROUP BY t.schemaname, t.tablename, t.rowsecurity
  )
  SELECT 
    schemaname || '.' || tablename,
    rowsecurity,
    pol_count::INTEGER,
    CASE 
      WHEN NOT rowsecurity THEN 'ERROR: RLS DISABLED'
      WHEN pol_count = 0 THEN 'WARNING: No policies'
      ELSE 'OK'
    END as status
  FROM table_policies
  ORDER BY 
    CASE 
      WHEN NOT rowsecurity THEN 1
      WHEN pol_count = 0 THEN 2
      ELSE 3
    END,
    tablename;
END;
$function$
;

create policy "Users can manage own bookmarks"
on "public"."bookmarks"
as permissive
for all
to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Admins can delete canonical lessons"
on "public"."canonical_lessons"
as permissive
for delete
to public
using (is_admin(auth.uid()));


create policy "Admins can insert canonical lessons"
on "public"."canonical_lessons"
as permissive
for insert
to public
with check (is_admin(auth.uid()));


create policy "Admins can update canonical lessons"
on "public"."canonical_lessons"
as permissive
for update
to public
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));


create policy "Public can view canonical lessons"
on "public"."canonical_lessons"
as permissive
for select
to public
using (true);


create policy "Admins can delete hierarchy"
on "public"."cultural_heritage_hierarchy"
as permissive
for delete
to public
using (is_admin(auth.uid()));


create policy "Admins can insert hierarchy"
on "public"."cultural_heritage_hierarchy"
as permissive
for insert
to public
with check (is_admin(auth.uid()));


create policy "Admins can update hierarchy"
on "public"."cultural_heritage_hierarchy"
as permissive
for update
to public
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));


create policy "Public can view cultural hierarchy"
on "public"."cultural_heritage_hierarchy"
as permissive
for select
to public
using (true);


create policy "Admins can insert to archive"
on "public"."lesson_archive"
as permissive
for insert
to public
with check (is_admin(auth.uid()));


create policy "Admins can view lesson archive"
on "public"."lesson_archive"
as permissive
for select
to public
using (is_admin(auth.uid()));


create policy "Super admins can delete from archive"
on "public"."lesson_archive"
as permissive
for delete
to public
using ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'super_admin'::text)))));


create policy "Users can delete own collections"
on "public"."lesson_collections"
as permissive
for delete
to authenticated
using ((auth.uid() = user_id));


create policy "Users can manage own collections"
on "public"."lesson_collections"
as permissive
for insert
to authenticated
with check ((auth.uid() = user_id));


create policy "Users can update own collections"
on "public"."lesson_collections"
as permissive
for update
to authenticated
using ((auth.uid() = user_id));


create policy "Users can view own collections and public collections"
on "public"."lesson_collections"
as permissive
for select
to authenticated
using (((auth.uid() = user_id) OR (is_public = true)));


create policy "Reviewers can update submissions"
on "public"."lesson_submissions"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['reviewer'::text, 'admin'::text]))))));


create policy "Reviewers can view all submissions"
on "public"."lesson_submissions"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['reviewer'::text, 'admin'::text]))))));


create policy "Admins and reviewers can create versions"
on "public"."lesson_versions"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = ANY (ARRAY['admin'::text, 'reviewer'::text]))))));


create policy "Everyone can view lesson versions"
on "public"."lesson_versions"
as permissive
for select
to public
using (true);


create policy "Admins and reviewers can insert lessons"
on "public"."lessons"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = ANY (ARRAY['admin'::text, 'reviewer'::text]))))));


create policy "Admins and reviewers can update lessons"
on "public"."lessons"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = ANY (ARRAY['admin'::text, 'reviewer'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = ANY (ARRAY['admin'::text, 'reviewer'::text]))))));


create policy "Lessons are viewable by everyone"
on "public"."lessons"
as permissive
for select
to public
using (true);


create policy "Users can manage own saved searches"
on "public"."saved_searches"
as permissive
for all
to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Admins can delete synonyms"
on "public"."search_synonyms"
as permissive
for delete
to public
using (is_admin(auth.uid()));


create policy "Admins can insert synonyms"
on "public"."search_synonyms"
as permissive
for insert
to public
with check (is_admin(auth.uid()));


create policy "Admins can update synonyms"
on "public"."search_synonyms"
as permissive
for update
to public
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));


create policy "Public can view synonyms"
on "public"."search_synonyms"
as permissive
for select
to public
using (true);


create policy "Reviewers can manage reviews"
on "public"."submission_reviews"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['reviewer'::text, 'admin'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['reviewer'::text, 'admin'::text]))))));


create policy "Reviewers can view similarities"
on "public"."submission_similarities"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['reviewer'::text, 'admin'::text]))))));


create policy "System can manage similarities"
on "public"."submission_similarities"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Admins can delete invitations"
on "public"."user_invitations"
as permissive
for delete
to public
using ((is_admin() AND (invited_by = auth.uid())));


create policy "Admins can update invitations"
on "public"."user_invitations"
as permissive
for update
to public
using ((is_admin() AND (invited_by = auth.uid())))
with check ((is_admin() AND (invited_by = auth.uid())));


create policy "Public can view by token"
on "public"."user_invitations"
as permissive
for select
to public
using (true);


create policy "Public can view valid invitation by token"
on "public"."user_invitations"
as permissive
for select
to public
using (((token IS NOT NULL) AND (expires_at > now()) AND (accepted_at IS NULL)));


create policy "Users view own invitations"
on "public"."user_invitations"
as permissive
for select
to public
using ((invited_by = auth.uid()));


create policy "Admins view audit logs"
on "public"."user_management_audit"
as permissive
for select
to public
using (is_admin());


create policy "System inserts audit logs"
on "public"."user_management_audit"
as permissive
for insert
to public
with check (true);


create policy "Anyone can view own profile"
on "public"."user_profiles"
as permissive
for select
to public
using ((id = auth.uid()));


create policy "Reviewers can view all profiles"
on "public"."user_profiles"
as permissive
for select
to public
using (is_reviewer_or_above());


create policy "Users can create their own profile"
on "public"."user_profiles"
as permissive
for insert
to public
with check ((auth.uid() = id));


create policy "Users can update own basic info"
on "public"."user_profiles"
as permissive
for update
to public
using ((id = auth.uid()))
with check (((id = auth.uid()) AND (role = ( SELECT user_profiles_1.role
   FROM user_profiles user_profiles_1
  WHERE (user_profiles_1.id = auth.uid()))) AND (is_active = ( SELECT user_profiles_1.is_active
   FROM user_profiles user_profiles_1
  WHERE (user_profiles_1.id = auth.uid()))) AND ((permissions IS NULL) OR (permissions = ( SELECT user_profiles_1.permissions
   FROM user_profiles user_profiles_1
  WHERE (user_profiles_1.id = auth.uid()))))));


create policy "Teachers can create submissions"
on "public"."lesson_submissions"
as permissive
for insert
to authenticated
with check ((auth.uid() = teacher_id));


create policy "Teachers can view own submissions"
on "public"."lesson_submissions"
as permissive
for select
to authenticated
using ((auth.uid() = teacher_id));


create policy "Admins can create invitations"
on "public"."user_invitations"
as permissive
for insert
to public
with check ((is_admin() AND (invited_by = auth.uid())));


create policy "Admins can view all invitations"
on "public"."user_invitations"
as permissive
for select
to public
using (is_admin());


create policy "Admins can update any profile"
on "public"."user_profiles"
as permissive
for update
to public
using (is_admin())
with check (is_admin());


CREATE TRIGGER trigger_lesson_collections_updated_at BEFORE UPDATE ON public.lesson_collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_lesson_submissions_updated_at BEFORE UPDATE ON public.lesson_submissions FOR EACH ROW EXECUTE FUNCTION update_lesson_submissions_updated_at();

CREATE TRIGGER trigger_update_lesson_search_vector BEFORE INSERT OR UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION update_lesson_search_vector();

CREATE TRIGGER update_lessons_search_vector BEFORE INSERT OR UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION update_search_vector();

CREATE TRIGGER trigger_log_user_profile_changes AFTER UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION log_user_profile_changes();

CREATE TRIGGER trigger_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_search_vector_trigger BEFORE INSERT OR UPDATE OF title, summary, main_ingredients, garden_skills, cooking_skills, thematic_categories, cultural_heritage, observances_holidays, tags, content_text ON public.lessons FOR EACH ROW EXECUTE FUNCTION update_lesson_search_vector();



