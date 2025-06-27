import { createBrowserClient, createServerClient as createServerClientSSR, type CookieOptions } from '@supabase/ssr'
import { Database } from '@/types/supabase'

type SupabaseClientOptions = {
  isServer?: boolean
  cookies?: {
    get: (name: string) => string | undefined
    set: (name: string, value: string, options: CookieOptions) => void
    remove: (name: string, options: CookieOptions) => void
  }
}

// Browser client
const createBrowserSupabaseClient = ({
  cookies,
}: Pick<SupabaseClientOptions, 'cookies'> = {}) => {
  if (typeof window === 'undefined') {
    throw new Error('This method is only meant to be called in the browser')
  }

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      realtime: {
        params: {
          eventsPerSecond: 2,
        },
      },
      cookies: {
        get(name: string) {
          if (!cookies) {
            const cookieStore = document.cookie.split('; ').reduce((acc, curr) => {
              const [key, value] = curr.split('=')
              acc[key] = value
              return acc
            }, {} as Record<string, string>)
            return cookieStore[name]
          }
          return cookies.get(name)
        },
        set(name: string, value: string, options: CookieOptions) {
          if (!cookies) {
            document.cookie = `${name}=${value}; path=/${options.path || '/'}; ${options.secure ? 'Secure;' : ''} ${options.sameSite ? `SameSite=${options.sameSite};` : ''} ${options.maxAge ? `Max-Age=${options.maxAge};` : ''} ${options.httpOnly ? 'HttpOnly;' : ''}`
          } else {
            cookies.set(name, value, options)
          }
        },
        remove(name: string, options: CookieOptions) {
          if (!cookies) {
            document.cookie = `${name}=; path=/${options.path || '/'}; expires=Thu, 01 Jan 1970 00:00:00 GMT; ${options.secure ? 'Secure;' : ''}`
          } else {
            cookies.remove(name, options)
          }
        },
      },
    }
  )
}

// Server client
export const createServerClient = ({
  cookies,
}: Pick<SupabaseClientOptions, 'cookies'> = {}) => {
  if (typeof window !== 'undefined') {
    return createBrowserSupabaseClient({ cookies })
  }

  // In server components, we don't need to handle cookies directly
  // as they are handled by the middleware
  return createServerClientSSR<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies?.get(name)
        },
        set(name: string, value: string, options: CookieOptions) {
          cookies?.set(name, value, options)
        },
        remove(name: string, options: CookieOptions) {
          cookies?.remove(name, options)
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 2,
        },
      },
    }
  )
}

// For backward compatibility - optimized version
export const createClient = () => {
  if (typeof window !== 'undefined') {
    // Ensure we don't recreate the client unnecessarily
    const key = 'supabase-client'
    if (!(window as any)[key]) {
      (window as any)[key] = createBrowserSupabaseClient()
    }
    return (window as any)[key]
  }
  return createServerClient()
}
