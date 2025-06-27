import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';

export function createClient(request: NextRequest) {
  // Create a response that we can modify before returning
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create a Supabase client configured to use cookies
  const supabase = createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Update the request's cookies
          request.cookies.set(name, value);
          
          // Update the response's cookies
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          
          // Set the cookie with options on the response
          response.cookies.set({
            name,
            value,
            path: '/',
            ...options,
          });
        },
        remove(name: string, options: any) {
          // Update the request's cookies
          request.cookies.delete(name);
          
          // Update the response's cookies
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          
          // Delete the cookie with options on the response
          response.cookies.delete({
            name,
            path: '/',
            ...options,
          });
        },
      },
    }
  );

  return { supabase, response };
}
