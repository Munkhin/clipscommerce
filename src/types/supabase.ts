export type Database = {
  public: {
    Tables: {
      model_training_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_name: string;
          status: 'pending' | 'running' | 'completed' | 'failed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_name: string;
          status?: 'pending' | 'running' | 'completed' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_name?: string;
          status?: 'pending' | 'running' | 'completed' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
      };
      trained_models: {
        Row: {
          id: string;
          model_name: string;
          model_type: string;
          version: string;
          description?: string;
          training_date: string;
          training_duration?: number;
          training_data_size?: number;
          performance_metrics: Record<string, number>;
          overall_score: number;
          model_data: any;
          model_size?: number;
          checksum?: string;
          status: 'training' | 'trained' | 'deployed' | 'deprecated' | 'failed';
          deployment_date?: string;
          deployment_environment?: 'development' | 'staging' | 'production';
          deployment_config?: any;
          is_latest: boolean;
          prediction_count: number;
          last_used?: string;
          tags: string[];
          created_by: string;
          created_at: string;
          updated_at: string;
          retirement_reason?: string;
          retirement_date?: string;
          parent_version?: string;
          model_path?: string;
        };
        Insert: {
          id?: string;
          model_name: string;
          model_type: string;
          version: string;
          description?: string;
          training_date: string;
          training_duration?: number;
          training_data_size?: number;
          performance_metrics: Record<string, number>;
          overall_score: number;
          model_data: any;
          model_size?: number;
          checksum?: string;
          status?: 'training' | 'trained' | 'deployed' | 'deprecated' | 'failed';
          deployment_date?: string;
          deployment_environment?: 'development' | 'staging' | 'production';
          deployment_config?: any;
          is_latest?: boolean;
          prediction_count?: number;
          last_used?: string;
          tags?: string[];
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          retirement_reason?: string;
          retirement_date?: string;
          parent_version?: string;
          model_path?: string;
        };
        Update: {
          id?: string;
          model_name?: string;
          model_type?: string;
          version?: string;
          description?: string;
          training_date?: string;
          training_duration?: number;
          training_data_size?: number;
          performance_metrics?: Record<string, number>;
          overall_score?: number;
          model_data?: any;
          model_size?: number;
          checksum?: string;
          status?: 'training' | 'trained' | 'deployed' | 'deprecated' | 'failed';
          deployment_date?: string;
          deployment_environment?: 'development' | 'staging' | 'production';
          deployment_config?: any;
          is_latest?: boolean;
          prediction_count?: number;
          last_used?: string;
          tags?: string[];
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          retirement_reason?: string;
          retirement_date?: string;
          parent_version?: string;
          model_path?: string;
        };
      };
      training_data_quality: {
        Row: {
          id: string;
          session_id: string;
          data_source: string;
          quality_score: number;
          issues_detected: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          data_source: string;
          quality_score: number;
          issues_detected: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          data_source?: string;
          quality_score?: number;
          issues_detected?: string[];
          created_at?: string;
        };
      };
      ai_suggestions: {
        Row: {
          id: string;
          user_id: string;
          suggestion_type: string;
          content: any;
          status: 'pending' | 'accepted' | 'rejected';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          suggestion_type: string;
          content: any;
          status?: 'pending' | 'accepted' | 'rejected';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          suggestion_type?: string;
          content?: any;
          status?: 'pending' | 'accepted' | 'rejected';
          created_at?: string;
          updated_at?: string;
        };
      };
      ab_experiments: {
        Row: {
          id: string;
          name: string;
          description?: string;
          status: 'draft' | 'running' | 'completed' | 'cancelled';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          status?: 'draft' | 'running' | 'completed' | 'cancelled';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          status?: 'draft' | 'running' | 'completed' | 'cancelled';
          created_at?: string;
          updated_at?: string;
        };
      };
      experiment_results: {
        Row: {
          id: string;
          experiment_id: string;
          variant: string;
          metrics: Record<string, number>;
          created_at: string;
        };
        Insert: {
          id?: string;
          experiment_id: string;
          variant: string;
          metrics: Record<string, number>;
          created_at?: string;
        };
        Update: {
          id?: string;
          experiment_id?: string;
          variant?: string;
          metrics?: Record<string, number>;
          created_at?: string;
        };
      };
      user_posts: {
        Row: {
          id: string;
          user_id: string;
          platform: string;
          platform_post_id: string;
          caption?: string;
          hashtags: string[];
          metrics: Record<string, number>;
          posted_at: string;
          content_type?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          platform: string;
          platform_post_id: string;
          caption?: string;
          hashtags?: string[];
          metrics?: Record<string, number>;
          posted_at: string;
          content_type?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          platform?: string;
          platform_post_id?: string;
          caption?: string;
          hashtags?: string[];
          metrics?: Record<string, number>;
          posted_at?: string;
          content_type?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          username?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          username?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          username?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      autopost_schedule: {
        Row: {
          id: string;
          user_id: string;
          platform: string;
          content: any;
          scheduled_for: string;
          status: 'pending' | 'posted' | 'failed' | 'cancelled';
          metadata: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          platform: string;
          content: any;
          scheduled_for: string;
          status?: 'pending' | 'posted' | 'failed' | 'cancelled';
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          platform?: string;
          content?: any;
          scheduled_for?: string;
          status?: 'pending' | 'posted' | 'failed' | 'cancelled';
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_social_credentials: {
        Row: {
          id: string;
          user_id: string;
          platform: string;
          credentials: any;
          status: 'active' | 'expired' | 'revoked';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          platform: string;
          credentials: any;
          status?: 'active' | 'expired' | 'revoked';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          platform?: string;
          credentials?: any;
          status?: 'active' | 'expired' | 'revoked';
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          details?: Record<string, any>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          details?: Record<string, any>;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          details?: Record<string, any>;
          created_at?: string;
        };
      };
      model_health_snapshots: {
        Row: {
          id: string;
          model_id: string;
          status: 'healthy' | 'degraded' | 'unhealthy';
          health_score: number;
          uptime_seconds: number;
          active_alerts_count: number;
          last_prediction_at: string;
          snapshot_at: string;
        };
        Insert: {
          id?: string;
          model_id: string;
          status: 'healthy' | 'degraded' | 'unhealthy';
          health_score: number;
          uptime_seconds: number;
          active_alerts_count: number;
          last_prediction_at: string;
          snapshot_at: string;
        };
        Update: {
          id?: string;
          model_id?: string;
          status?: 'healthy' | 'degraded' | 'unhealthy';
          health_score?: number;
          uptime_seconds?: number;
          active_alerts_count?: number;
          last_prediction_at?: string;
          snapshot_at?: string;
        };
      };
      pricing_tiers: {
        Row: {
          id: string;
          name: string;
          price: number;
          currency: string;
          order: number;
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          currency: string;
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
          created_at?: string;
          updated_at?: string;
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
