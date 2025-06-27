import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { serverStorageService, BucketName } from '@/lib/storage/supabase-storage';
import { cookies } from 'next/headers';

interface RouteParams {
  params: {
    bucket: BucketName;
    path: string[];
  };
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient({
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          cookieStore.set(name, value, options);
        },
        remove: (name: string, options: any) => {
          cookieStore.delete(name);
        }
      }
    });

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bucket, path } = params;
    const filePath = path.join('/');

    await serverStorageService.deleteFile(bucket, filePath, user.id);

    return NextResponse.json({ 
      success: true, 
      message: 'File deleted successfully' 
    });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient({
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          cookieStore.set(name, value, options);
        },
        remove: (name: string, options: any) => {
          cookieStore.delete(name);
        }
      }
    });

    const { bucket, path } = params;
    const filePath = path.join('/');
    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download') === 'true';
    const expiresIn = searchParams.get('expiresIn') ? parseInt(searchParams.get('expiresIn') as string) : 3600;

    // For public buckets, return public URL
    if (bucket === 'avatars' || bucket === 'thumbnails') {
      const publicUrl = serverStorageService.getPublicUrl(bucket, filePath);
      
      if (download) {
        // Redirect to the file with download headers
        return Response.redirect(publicUrl);
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
    console.error('File access error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Access failed' },
      { status: 500 }
    );
  }
}