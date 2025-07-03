import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate CSRF token
    const csrfToken = crypto.randomBytes(32).toString('hex');
    
    // In a production app, you'd store this token in a secure session store
    // For now, we'll generate a simple token that can be validated
    
    return NextResponse.json({
      csrfToken,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}