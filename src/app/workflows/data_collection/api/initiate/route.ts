import { NextResponse } from 'next/server';
import { ScannerService } from '../../functions/ScannerService';
import { ScanOptions } from '../../functions/types';

// Initialize a single instance of the scanner service
const scannerService = new ScannerService();

// Initialize platform clients (in a real app, this would be done with proper auth)
scannerService.initializePlatforms([
  { platform: 'TIKTOK' as any, accessToken: process.env.TIKTOK_ACCESS_TOKEN || '' },
  // Add other platforms as needed
]);

export async function POST(request: Request) {
  try {
    const { userId, options } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

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
