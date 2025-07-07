import { NextRequest, NextResponse } from 'next/server';
import { AuditLogService } from '@/services/AuditLogService';
import { authMiddleware } from '@/lib/middleware/authMiddleware';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request, { requireAuth: true });

    if (!authResult.success) {
      return authResult.response!;
    }

    const { userId, action, details } = await request.json();

    if (!userId || !action) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const auditLogService = new AuditLogService();
    await auditLogService.log(userId, action, details);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Audit log API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
} 