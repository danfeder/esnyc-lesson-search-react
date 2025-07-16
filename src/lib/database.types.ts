// Generated types for Supabase database
export interface Database {
  public: {
    Tables: {
      lessons: {
        Row: {
          id: string;
          lesson_id: string;
          title: string;
          summary: string;
          file_link: string;
          grade_levels: string[];
          metadata: any; // JSON field
          confidence: any; // JSON field
          search_vector: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          title: string;
          summary: string;
          file_link: string;
          grade_levels: string[];
          metadata: any;
          confidence: any;
          search_vector?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          title?: string;
          summary?: string;
          file_link?: string;
          grade_levels?: string[];
          metadata?: any;
          confidence?: any;
          search_vector?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          school: string | null;
          grades_taught: string[];
          subjects: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          school?: string | null;
          grades_taught?: string[];
          subjects?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string;
          school?: string | null;
          grades_taught?: string[];
          subjects?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      saved_searches: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          filters: any; // JSON field
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          filters: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          filters?: any;
          created_at?: string;
        };
      };
      lesson_collections: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          lesson_ids: string[];
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          lesson_ids?: string[];
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          lesson_ids?: string[];
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      // eslint-disable-next-line no-unused-vars
      [_ in never]: never;
    };
    Functions: {
      search_lessons: {
        Args: {
          search_query: string;
          grade_filter?: string[];
          theme_filter?: string[];
          season_filter?: string[];
          competency_filter?: string[];
          culture_filter?: string[];
          location_filter?: string[];
          activity_filter?: string[];
          format_filter?: string[];
          include_all_seasons?: boolean;
          limit_count?: number;
          offset_count?: number;
        };
        Returns: {
          id: string;
          lesson_id: string;
          title: string;
          summary: string;
          file_link: string;
          grade_levels: string[];
          metadata: any;
          confidence: any;
          rank: number;
        }[];
      };
    };
    Enums: {
      // eslint-disable-next-line no-unused-vars
      [_ in never]: never;
    };
  };
}
