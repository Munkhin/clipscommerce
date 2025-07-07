import { NextRequest, NextResponse } from 'next/server';
import { ScannerServiceAdapter } from '@/app/workflows/data_collection/functions/ScannerServiceAdapter';

const scanner = new ScannerServiceAdapter();

export async function POST(request: NextRequest) {
  try {
    const { userId, niche, competitors, platforms = ['tiktok'], lookbackDays = 30 } = await request.json();
    if (!userId || !niche) {
      return NextResponse.json({ error: 'Missing required fields: userId, niche' }, { status: 400 });
    }
    const options = {
      platforms,
      lookbackDays,
      includeOwnPosts: true,
      competitors: competitors ? competitors.split('\n').map((c: string) => c.trim()).filter(Boolean) : [],
    };
    const scanId = await scanner.startScan(userId, options);
    return NextResponse.json({ success: true, scanId });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Failed to start scan' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scanId = searchParams.get('scanId');
    if (!scanId) {
      return NextResponse.json({ error: 'Missing scanId' }, { status: 400 });
    }
    const result = await scanner.getScan(scanId);
    if (!result) {
      return NextResponse.json({ error: 'Scan result not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Failed to fetch scan result' }, { status: 500 });
  }
} 