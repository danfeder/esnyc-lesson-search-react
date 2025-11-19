export interface LessonDetail {
  lessonId: string;
  title: string;
  summary?: string;
  lastModified?: string;
  createdAt?: string;
  metadataCompleteness: number;
  canonicalScore: number;
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
