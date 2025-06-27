import { generateCsrfToken } from '@/lib/csrf';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const { token, cookie } = await generateCsrfToken();
    
    const response = NextResponse.json(
      { token },
      { status: 200 }
    );
    
    // Set the CSRF token as an HTTP-only cookie
    response.headers.set('Set-Cookie', cookie);
    
    return response;
  } catch (error) {
    console.error('CSRF token generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}

export { POST as GET };
