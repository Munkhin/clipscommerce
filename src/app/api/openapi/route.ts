import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    
    // Determine file path based on format
    const fileName = format === 'yaml' ? 'openapi.yaml' : 'openapi.json';
    const filePath = join(process.cwd(), 'public', fileName);
    
    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { 
          error: 'OpenAPI documentation not found',
          message: 'Please run `npm run generate:openapi` to generate the documentation'
        }, 
        { status: 404 }
      );
    }
    
    // Read and return the file
    const fileContent = readFileSync(filePath, 'utf-8');
    
    if (format === 'yaml') {
      return new NextResponse(fileContent, {
        headers: {
          'Content-Type': 'application/x-yaml',
          'Cache-Control': 'public, max-age=300', // 5 minutes
        },
      });
    } else {
      return new NextResponse(fileContent, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300', // 5 minutes
        },
      });
    }
    
  } catch (error) {
    console.error('Error serving OpenAPI documentation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function HEAD(request: NextRequest) {
  // Handle HEAD requests for the OpenAPI file
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';
  const fileName = format === 'yaml' ? 'openapi.yaml' : 'openapi.json';
  const filePath = join(process.cwd(), 'public', fileName);
  
  if (!existsSync(filePath)) {
    return new NextResponse(null, { status: 404 });
  }
  
  const contentType = format === 'yaml' ? 'application/x-yaml' : 'application/json';
  return new NextResponse(null, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=300',
    },
  });
}