import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { serverStorageService, BucketName } from '@/lib/storage/supabase-storage';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const bucket = formData.get('bucket') as BucketName;
    const optimize = formData.get('optimize') === 'true';
    const maxWidth = formData.get('maxWidth') ? parseInt(formData.get('maxWidth') as string) : undefined;
    const maxHeight = formData.get('maxHeight') ? parseInt(formData.get('maxHeight') as string) : undefined;
    const quality = formData.get('quality') ? parseInt(formData.get('quality') as string) : undefined;
    const tags = formData.get('tags') ? JSON.parse(formData.get('tags') as string) : [];
    const expiresIn = formData.get('expiresIn') ? parseInt(formData.get('expiresIn') as string) : undefined;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (!bucket) {
      return NextResponse.json({ error: 'Bucket is required' }, { status: 400 });
    }

    // Upload files
    const uploadPromises = files.map(file =>
      serverStorageService.uploadFile({
        bucket,
        file,
        userId: user.id,
        optimize,
        maxWidth,
        maxHeight,
        quality,
        tags,
        expiresIn
      })
    );

    const results = await Promise.allSettled(uploadPromises);
    
    const successful = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);
    
    const failed = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => result.reason.message || 'Upload failed');

    return NextResponse.json({
      success: true,
      uploaded: successful,
      errors: failed,
      count: {
        successful: successful.length,
        failed: failed.length,
        total: files.length
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'stats':
        const stats = await serverStorageService.getUserFileStats(user.id);
        return NextResponse.json({ success: true, stats });

      case 'cleanup':
        const cleaned = await serverStorageService.cleanupExpiredFiles(user.id);
        return NextResponse.json({ success: true, cleanedFiles: cleaned });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Storage API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}