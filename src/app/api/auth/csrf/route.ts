import { NextRequest, NextResponse } from 'next/server';
import { generateCsrfToken } from '@/lib/csrf';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate CSRF token using the proper CSRF library
    const { token, cookie } = await generateCsrfToken();
    
    const response = NextResponse.json({
      token,
      timestamp: Date.now(),
    });

    // Set the CSRF cookie
    response.headers.set('Set-Cookie', cookie);
    
    return response;

  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}