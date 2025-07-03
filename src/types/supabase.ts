export type Database = {
  public: {
    Tables: {
      model_training_sessions: unknown;
      trained_models: unknown;
      training_data_quality: unknown;
      ai_suggestions: unknown;
      ab_experiments: unknown;
      experiment_results: unknown;
      user_posts: unknown;
      profiles: unknown;
      autopost_schedule: unknown;
      user_social_credentials: unknown;
      pricing_tiers: {
        Row: {
          id: string;
          name: string;
          price: number;
          currency: string;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          currency?: string;
          order: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price?: number;
          currency?: string;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      tier_benefits: {
        Row: {
          id: string;
          tier_id: string;
          description: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tier_id: string;
          description: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tier_id?: string;
          description?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Add any other tables referenced in the codebase
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
