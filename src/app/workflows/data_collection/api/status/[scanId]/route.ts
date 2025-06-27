import { NextResponse } from 'next/server';
import { ScannerService } from '../../../functions/ScannerService';

// Initialize the scanner service instance
const scannerService = new ScannerService();

export async function GET(
  request: Request,
  context: any
) {
  const { params } = context;
  try {
    const { scanId } = params;
    
    if (!scanId) {
      return NextResponse.json(
        { error: 'Scan ID is required' },
        { status: 400 }
      );
    }

    const scanResult = await scannerService.getScanResult(scanId);
    
    if (!scanResult) {
      return NextResponse.json(
        { error: 'Scan not found or expired' },
        { status: 404 }
      );
    }

    // Return the scan result, excluding any sensitive data
    const { userId, ...publicResult } = scanResult;
    
    return NextResponse.json({
      ...publicResult,
      // Add a self link for HATEOAS
      _links: {
        self: { href: `/api/scan/status/${scanId}` }
      }
    });

  } catch (error) {
    console.error('Error fetching scan status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch scan status', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
