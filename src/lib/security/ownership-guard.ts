import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { User } from '@supabase/supabase-js';
import logger from '@/utils/logger';

export interface OwnershipGuardOptions {
  table: string;
  userIdField?: string;
  resourceIdField?: string;
  allowAdmin?: boolean;
  allowTeamAccess?: boolean;
}

export interface OwnershipCheckResult {
  success: boolean;
  response?: NextResponse;
  resource?: any;
}

/**
 * Verify that a user owns or has access to a specific resource
 */
export async function verifyResourceOwnership(
  user: User,
  resourceId: string,
  options: OwnershipGuardOptions
): Promise<OwnershipCheckResult> {
  const {
    table,
    userIdField = 'user_id',
    resourceIdField = 'id',
    allowAdmin = true,
    allowTeamAccess = false
  } = options;

  try {
    const supabase = createClient(cookies());

    // Get user profile for role and team information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, subscription_tier, team_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logger.error('Failed to fetch user profile for ownership check', profileError instanceof Error ? profileError : new Error(String(profileError)), {
        userId: user.id,
        resourceId,
        table
      });
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Profile access error' },
          { status: 500 }
        )
      };
    }

    // Admin users have access to everything
    if (allowAdmin && profile?.role === 'admin') {
      return { success: true };
    }

    // Query the resource
    const { data: resource, error: resourceError } = await supabase
      .from(table)
      .select('*')
      .eq(resourceIdField, resourceId)
      .single();

    if (resourceError) {
      if (resourceError.code === 'PGRST116') {
        // Resource not found
        return {
          success: false,
          response: NextResponse.json(
            { error: 'Resource not found' },
            { status: 404 }
          )
        };
      }
      
      logger.error('Database error during ownership check', resourceError instanceof Error ? resourceError : new Error(String(resourceError)), {
        userId: user.id,
        resourceId,
        table
      });
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Database access error' },
          { status: 500 }
        )
      };
    }

    // Check direct ownership
    if (resource[userIdField] === user.id) {
      return { success: true, resource };
    }

    // Check team access if enabled
    if (allowTeamAccess && profile?.team_id && resource.team_id === profile.team_id) {
      return { success: true, resource };
    }

    // Access denied
    logger.warn('Resource access denied', {
      userId: user.id,
      resourceId,
      table,
      resourceOwnerId: resource[userIdField],
      userTeamId: profile?.team_id,
      resourceTeamId: resource.team_id
    });

    return {
      success: false,
      response: NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    };

  } catch (error: unknown) {
    logger.error('Ownership verification error', error instanceof Error ? error : new Error(String(error)), {
      userId: user.id,
      resourceId,
      table
    });
    
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Internal security error' },
        { status: 500 }
      )
    };
  }
}

/**
 * Extract resource ID from request URL params
 */
export function extractResourceId(
  request: NextRequest,
  paramName: string = 'id'
): string | null {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  
  // Look for the parameter in common REST patterns
  const paramIndex = pathSegments.findIndex(segment => segment === paramName);
  if (paramIndex !== -1 && pathSegments[paramIndex + 1]) {
    return pathSegments[paramIndex + 1];
  }
  
  // Check query parameters
  return url.searchParams.get(paramName);
}

/**
 * Common patterns for resource access control
 */
export const ownershipPatterns = {
  // User can only access their own clips
  userClips: {
    table: 'clips',
    userIdField: 'user_id',
    allowTeamAccess: true
  },
  
  // User can only access their own posts
  userPosts: {
    table: 'posts',
    userIdField: 'user_id',
    allowTeamAccess: true
  },
  
  // User can only access their own analytics
  userAnalytics: {
    table: 'analytics',
    userIdField: 'user_id',
    allowTeamAccess: false
  },
  
  // User can only access their own integrations
  userIntegrations: {
    table: 'user_social_credentials',
    userIdField: 'user_id',
    allowTeamAccess: false
  },
  
  // Team-level resources
  teamResources: {
    table: 'team_resources',
    userIdField: 'created_by',
    allowTeamAccess: true
  }
};