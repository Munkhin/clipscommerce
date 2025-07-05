import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';
import { Permission, Role, serverRoleManager } from '@/lib/rbac/roleManager';

export interface AuthMiddlewareOptions {
  requireAuth?: boolean;
  require2FA?: boolean;
  requireRole?: Role;
  requirePermission?: Permission;
  requireAnyPermission?: Permission[];
  requireAllPermissions?: Permission[];
  teamId?: string;
}

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email: string;
    role: Role | null;
    permissions: Permission[];
    has2FA: boolean;
    teamId?: string;
  };
}

/**
 * Authentication middleware that handles user authentication, 2FA, and RBAC
 */
export async function authMiddleware(
  request: NextRequest,
  options: AuthMiddlewareOptions = {}
): Promise<{ success: boolean; response?: NextResponse; user?: any }> {
  const {
    requireAuth = true,
    require2FA = false,
    requireRole,
    requirePermission,
    requireAnyPermission,
    requireAllPermissions,
    teamId
  } = options;

  try {
    const supabase = await createClient(cookies());
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (requireAuth && (userError || !user)) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      };
    }

    if (!user) {
      return { success: true };
    }

    // Get user's role and permissions
    const userRole = await serverRoleManager.getUserHighestRole(user.id, teamId);
    const userPermissions = await serverRoleManager.getUserPermissions(user.id, teamId);

    // Check 2FA requirement
    let has2FA = false;
    if (require2FA) {
      const { data: twoFactorSettings } = await supabase
        .from('user_2fa_settings')
        .select('totp_enabled')
        .eq('user_id', user.id)
        .single();

      has2FA = twoFactorSettings?.totp_enabled || false;
      
      if (!has2FA) {
        return {
          success: false,
          response: NextResponse.json(
            { error: '2FA is required for this action' },
            { status: 403 }
          )
        };
      }
    }

    // Check role requirement
    if (requireRole && userRole !== requireRole) {
      logger.warn(`User ${user.id} attempted to access ${request.url} without required role ${requireRole}`);
      return {
        success: false,
        response: NextResponse.json(
          { error: `Role ${requireRole} is required for this action` },
          { status: 403 }
        )
      };
    }

    // Check single permission requirement
    if (requirePermission) {
      const hasPermission = await serverRoleManager.hasPermission(user.id, requirePermission, teamId);
      if (!hasPermission) {
        logger.warn(`User ${user.id} attempted to access ${request.url} without required permission ${requirePermission}`);
        return {
          success: false,
          response: NextResponse.json(
            { error: `Permission ${requirePermission} is required for this action` },
            { status: 403 }
          )
        };
      }
    }

    // Check any permission requirement
    if (requireAnyPermission && requireAnyPermission.length > 0) {
      const hasAnyPermission = await serverRoleManager.hasAnyPermission(user.id, requireAnyPermission, teamId);
      if (!hasAnyPermission) {
        logger.warn(`User ${user.id} attempted to access ${request.url} without any required permissions`);
        return {
          success: false,
          response: NextResponse.json(
            { error: `One of the following permissions is required: ${requireAnyPermission.join(', ')}` },
            { status: 403 }
          )
        };
      }
    }

    // Check all permissions requirement
    if (requireAllPermissions && requireAllPermissions.length > 0) {
      const hasAllPermissions = await serverRoleManager.hasAllPermissions(user.id, requireAllPermissions, teamId);
      if (!hasAllPermissions) {
        logger.warn(`User ${user.id} attempted to access ${request.url} without all required permissions`);
        return {
          success: false,
          response: NextResponse.json(
            { error: `All of the following permissions are required: ${requireAllPermissions.join(', ')}` },
            { status: 403 }
          )
        };
      }
    }

    // Create enriched user object
    const enrichedUser = {
      id: user.id,
      email: user.email || '',
      role: userRole,
      permissions: userPermissions,
      has2FA,
      teamId
    };

    return {
      success: true,
      user: enrichedUser
    };

  } catch (error) {
    logger.error('Unexpected error in auth middleware:', error);
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    };
  }
}

/**
 * Higher-order function to create auth middleware for specific routes
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  return async (request: NextRequest) => {
    const result = await authMiddleware(request, options);
    
    if (!result.success) {
      return result.response;
    }

    // If auth is successful, continue to the next middleware/handler
    return NextResponse.next();
  };
}

/**
 * Middleware to check if user has specific permission
 */
export function requirePermission(permission: Permission) {
  return createAuthMiddleware({ requirePermission: permission });
}

/**
 * Middleware to check if user has specific role
 */
export function requireRole(role: Role) {
  return createAuthMiddleware({ requireRole: role });
}

/**
 * Middleware to require 2FA
 */
export function require2FA() {
  return createAuthMiddleware({ require2FA: true });
}

/**
 * Middleware to require admin role
 */
export function requireAdmin() {
  return createAuthMiddleware({ requireRole: Role.ADMIN });
}

/**
 * Middleware to require manager or admin role
 */
export function requireManager() {
  return createAuthMiddleware({ 
    requireAnyPermission: [Permission.TEAM_MANAGE_MEMBERS, Permission.SYSTEM_SETTINGS] 
  });
}

/**
 * Audit log for security events
 */
export async function logSecurityEvent(
  userId: string,
  event: string,
  details: any,
  request: NextRequest
) {
  try {
    const supabase = await createClient(cookies());
    
    await supabase.from('audit_logs').insert({
      user_id: userId,
      event_type: 'security',
      event_name: event,
      details: details,
      ip_address: request.ip,
      user_agent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    });

    logger.info(`Security event logged: ${event} for user ${userId}`);
  } catch (error) {
    logger.error('Error logging security event:', error);
  }
}