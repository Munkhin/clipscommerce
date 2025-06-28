import { NextRequest, NextResponse } from 'next/server';
import { ScannerService } from '../../functions/ScannerService';
import { ScanOptions } from '../../functions/types';
import { authGuard, createValidator, validators } from '@/lib/security/auth-guard';

// Initialize a single instance of the scanner service
const scannerService = new ScannerService();

// Initialize platform clients (in a real app, this would be done with proper auth)
scannerService.initializePlatforms([
  { platform: 'TIKTOK' as any, accessToken: process.env.TIKTOK_ACCESS_TOKEN || '' },
  // Add other platforms as needed
]);

const inputValidator = createValidator({
  userId: [validators.required, validators.string],
  options: [(value: any) => !value || typeof value === 'object']
});

export async function POST(request: NextRequest) {
  // Apply security guard with authentication, authorization, and input validation
  const guardResult = await authGuard(request, {
    requireAuth: true,
    requireCsrf: true,
    rateLimit: {
      identifier: 'data-collection-initiate',
      requests: 5,
      window: '1m'
    },
    validateInput: inputValidator
  });

  if (!guardResult.success) {
    return guardResult.response!;
  }

  const { user, body } = guardResult.context!;
  const { userId, options } = body;
  
  // Ensure user can only initiate scans for themselves
  if (userId !== user!.id) {
    return NextResponse.json(
      { error: 'Can only initiate scans for your own account' },
      { status: 403 }
    );
  }

  try {

    const scanOptions: ScanOptions = {
      platforms: options?.platforms || ['TIKTOK' as any],
      competitors: options?.competitors || [],
      lookbackDays: options?.lookbackDays || 30,
      includeOwnPosts: options?.includeOwnPosts ?? true,
    };

    const scanId = await scannerService.startScan(userId, scanOptions);
    
    return NextResponse.json({
      scanId,
      status: 'pending',
      message: 'Scan initiated successfully',
    });

  } catch (error) {
    console.error('Error initiating scan:', error);
    return NextResponse.json(
      { error: 'Failed to initiate scan', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
