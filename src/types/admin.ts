import type { Database } from './database.types';

export interface LessonDetail {
  lessonId: string;
  title: string;
  summary?: string;
  lastModified?: string;
  createdAt?: string;
  /** Optional - may not be present in report JSON */
  metadataCompleteness?: number;
  /** Optional - may not be present in report JSON */
  canonicalScore?: number;
  gradelevels?: string[];
  culturalHeritage?: string[];
  seasonTiming?: string[];
  scoreBreakdown?: {
    recency: number;
    completeness: number;
    gradeCoverage: number;
    totalScore: number;
    qualityNotes: string[];
  };
  contentHash?: string;
}

/**
 * V3 Duplicate Report Types
 * These interfaces represent the raw JSON structure from duplicate-analysis-v3-*.json files
 */

/** Lesson as it appears in V3 report JSON */
export interface V3ReportLesson {
  lessonId: string;
  title: string;
  canonicalScore?: number;
  metadataCompleteness?: number;
  scoreBreakdown?: {
    recency: number;
    completeness: number;
    gradeCoverage: number;
    totalScore: number;
    qualityNotes: string[];
  };
}

/** Sub-group structure in V3 report */
export interface V3ReportSubGroup {
  groupName: string;
  lessonIds: string[];
  rationale: string;
}

/** Individual group as it appears in V3 report JSON */
export interface V3ReportGroup {
  groupId: string;
  category?: string;
  confidence?: 'high' | 'medium' | 'low';
  recommendedAction?: 'auto_merge' | 'manual_review' | 'keep_all' | 'split_group';
  recommendedCanonical?: string | string[];
  lessonCount: number;
  lessons: V3ReportLesson[];
  similarityMatrix?: Record<string, Record<string, number>>;
  subGroups?: V3ReportSubGroup[];
  insights?: {
    keyDifferences: string[];
    commonElements: string[];
    qualityIssues: string[];
    pedagogicalNotes: string[];
  };
}

/** Full V3 duplicate analysis report */
export interface V3DuplicateReport {
  version: '3.0';
  generatedAt: string;
  categorizedGroups: Record<string, V3ReportGroup[]>;
  summary?: {
    totalGroups: number;
    byCategory: Record<string, number>;
    byAction: Record<string, number>;
  };
}

/**
 * V2 Duplicate Report Types
 * Fallback format for older duplicate-analysis-v2-*.json files
 */

/** Lesson as it appears in V2 report JSON */
export interface V2ReportLesson {
  lessonId: string;
  title: string;
  isRecommendedCanonical?: boolean;
}

/** Individual group as it appears in V2 report JSON */
export interface V2ReportGroup {
  groupId: string;
  type: 'exact' | 'near' | 'title' | 'mixed';
  similarityScore?: number;
  averageSimilarity?: number;
  lessonCount: number;
  recommendedCanonical?: string;
  lessons: V2ReportLesson[];
}

/** Full V2 duplicate analysis report */
export interface V2DuplicateReport {
  version?: '2.0';
  generatedAt: string;
  groups: V2ReportGroup[];
}

/** Union type for loading either report version */
export type DuplicateReport = V3DuplicateReport | V2DuplicateReport;

/** Type guard to check if report is V3 format */
export function isV3Report(report: DuplicateReport): report is V3DuplicateReport {
  return report.version === '3.0';
}

export interface DuplicateGroup {
  groupId: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  recommendedAction: 'auto_merge' | 'manual_review' | 'keep_all' | 'split_group';
  recommendedCanonical: string | string[];
  lessonCount: number;
  lessons: LessonDetail[];
  insights: {
    keyDifferences: string[];
    commonElements: string[];
    qualityIssues: string[];
    pedagogicalNotes: string[];
  };
  subGroups?: {
    groupName: string;
    lessonIds: string[];
    rationale: string;
  }[];
  similarityMatrix?: Record<string, Record<string, number>>;
}

/**
 * Type alias for lesson data from lessons_with_metadata database view.
 * Used when loading full lesson details for admin pages.
 */
export type LessonWithMetadata = Database['public']['Views']['lessons_with_metadata']['Row'];
