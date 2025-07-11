import { NextRequest, NextResponse } from 'next/server';

export async function generateStaticParams() {
  return [];
}
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { serverStorageService, BucketName } from '@/lib/storage/supabase-storage';
import { URL } from 'url';

interface RouteParams {
  params: Promise<{
    bucket: BucketName;
    path: string[];
  }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient(cookies());

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bucket, path } = await params;
    const filePath = path.join('/');

    // Verify file ownership before deletion
    const fileRecord = await serverStorageService.getFileMetadata(bucket, filePath);
    if (fileRecord && fileRecord.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await serverStorageService.deleteFile(bucket, filePath, user.id);

    return NextResponse.json({ 
      success: true, 
      message: 'File deleted successfully' 
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient(cookies());

    const { bucket, path } = await params;
    const filePath = path.join('/');
    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download') === 'true';
    const expiresIn = searchParams.get('expiresIn') ? parseInt(searchParams.get('expiresIn') as string) : 3600;

    // For public buckets, return public URL
    if (bucket === 'avatars' || bucket === 'thumbnails') {
      const publicUrl = serverStorageService.getPublicUrl(bucket, filePath);
      
      if (download) {
        // Redirect to the file with download headers
        return Response.redirect(await publicUrl);
      }
      
      return NextResponse.json({ 
        success: true, 
        url: publicUrl,
        type: 'public'
      });
    }

    // For private buckets, check authentication and ownership
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify file ownership for private files
    const fileRecord = await serverStorageService.getFileMetadata(bucket, filePath);
    if (fileRecord && fileRecord.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Generate signed URL for private access
    const signedUrl = await serverStorageService.getSignedUrl(bucket, filePath, expiresIn);
    
    if (download) {
      return Response.redirect(signedUrl);
    }
    
    return NextResponse.json({ 
      success: true, 
      url: signedUrl,
      type: 'signed',
      expiresIn
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Access failed' },
      { status: 500 }
    );
  }
}
