import { createClient } from '@supabase/supabase-js';

export class AuditLogService {
  private supabase;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async log(userId: string, action: string, details?: any) {
    const { error } = await this.supabase.from('audit_logs').insert([
      {
        user_id: userId,
        action,
        details,
      },
    ]);

    if (error) {
      console.error('Error logging audit event:', error);
    }
  }
}
