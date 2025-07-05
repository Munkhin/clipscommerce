import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware, logSecurityEvent } from '@/lib/middleware/authMiddleware';
import { Permission, Role } from '@/lib/rbac/roleManager';
import logger from '@/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * Example sensitive operation that requires admin role and 2FA
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user and check strict requirements
    const authResult = await authMiddleware(request, {
      requireAuth: true,
      require2FA: true,
      requireRole: Role.ADMIN
    });

    if (!authResult.success) {
      return authResult.response!;
    }

    const { action, targetUserId } = await request.json();

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // Log security event
    await logSecurityEvent(
      authResult.user!.id,
      'sensitive_operation_attempted',
      {
        action,
        targetUserId,
        userRole: authResult.user!.role,
        has2FA: authResult.user!.has2FA
      },
      request
    );

    // Perform the sensitive operation
    // This would be your actual implementation
    logger.info(`Admin ${authResult.user!.id} performed sensitive operation: ${action}`);

    return NextResponse.json({
      success: true,
      message: 'Sensitive operation completed successfully',
      performedBy: authResult.user!.email,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in sensitive operation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Example route that requires specific permissions
 */
export async function GET(request: NextRequest) {
  try {
    // Check for specific permissions instead of role
    const authResult = await authMiddleware(request, {
      requireAuth: true,
      requireAnyPermission: [Permission.SYSTEM_AUDIT_LOGS, Permission.SYSTEM_MONITORING]
    });

    if (!authResult.success) {
      return authResult.response!;
    }

    // Return admin dashboard data
    return NextResponse.json({
      success: true,
      user: {
        email: authResult.user!.email,
        role: authResult.user!.role,
        permissions: authResult.user!.permissions,
        has2FA: authResult.user!.has2FA
      },
      systemStatus: 'operational',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in admin GET endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}