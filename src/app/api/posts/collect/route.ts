import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Validation schema for post collection request
const collectPostsSchema = z.object({
  platforms: z.array(z.enum(['instagram', 'tiktok', 'youtube'])).min(1),
  date_range: z.object({
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
  }).optional(),
  force_refresh: z.boolean().optional().default(false),
  include_metrics: z.boolean().optional().default(true),
});

// POST - Start post collection process
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = collectPostsSchema.parse(body);

    // Validate date range
    if (validatedData.date_range?.start_date && validatedData.date_range?.end_date) {
      const startDate = new Date(validatedData.date_range.start_date);
      const endDate = new Date(validatedData.date_range.end_date);
      
      if (startDate >= endDate) {
        return NextResponse.json({ 
          error: 'Start date must be before end date' 
        }, { status: 400 });
      }
    }

    // Check for existing collection in progress
    if (!validatedData.force_refresh) {
      const existingCollection = await checkExistingCollection(user.id, validatedData.platforms);
      if (existingCollection.inProgress) {
        return NextResponse.json({
          error: 'Post collection already in progress',
          collection_id: existingCollection.collectionId,
          estimated_completion: existingCollection.estimatedCompletion,
        }, { status: 409 });
      }
    }

    // Verify platform credentials
    const credentialCheck = await verifyPlatformCredentials(user.id, validatedData.platforms);
    if (!credentialCheck.allValid) {
      return NextResponse.json({
        error: 'Missing or invalid credentials for some platforms',
        invalid_platforms: credentialCheck.invalidPlatforms,
      }, { status: 400 });
    }

    // Create collection job
    const collectionId = `collection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const collectionJob = {
      collection_id: collectionId,
      user_id: user.id,
      platforms: validatedData.platforms,
      status: 'initiated',
      progress: 0,
      current_platform: null,
      date_range: validatedData.date_range,
      include_metrics: validatedData.include_metrics,
      started_at: new Date().toISOString(),
      estimated_completion: calculateEstimatedCompletion(validatedData.platforms),
    };

    // Store collection job (you might want to use a separate table for jobs)
    await storeCollectionJob(collectionJob);

    // Start collection process asynchronously
    startPostCollection(collectionJob);

    return NextResponse.json({
      success: true,
      collection_id: collectionId,
      status: 'initiated',
      estimated_completion: collectionJob.estimated_completion,
      platforms: validatedData.platforms,
    });

  } catch (error) {
    console.error('Post collection error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to start post collection' }, { status: 500 });
  }
}

// GET - Check collection status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get('collection_id');

    if (collectionId) {
      // Get specific collection status
      const status = await getCollectionStatus(collectionId, user.id);
      if (!status) {
        return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        collection: status,
      });
    } else {
      // Get recent collections
      const recentCollections = await getRecentCollections(user.id);
      
      return NextResponse.json({
        success: true,
        collections: recentCollections,
      });
    }

  } catch (error) {
    console.error('Collection status error:', error);
    return NextResponse.json({ error: 'Failed to get collection status' }, { status: 500 });
  }
}

// Helper functions
async function checkExistingCollection(_userId: string, _platforms: string[]) {
  // Check for any in-progress collections for the same platforms
  // This would typically query a jobs table or similar
  
  // For now, return mock data
  return {
    inProgress: false,
    collectionId: null,
    estimatedCompletion: null,
  };
}

interface SocialCredentials {
  expires_at?: string | number;
  access_token?: string;
  refresh_token?: string;
  platform_user_id?: string;
  [key: string]: unknown;
}

async function verifyPlatformCredentials(userId: string, platforms: string[]) {
  const supabase = await createClient(cookies());
  
  const credentialChecks = await Promise.all(
    platforms.map(async (platform) => {
      const { data: credentials, error } = await supabase
        .from('user_social_credentials')
        .select('*')
        .eq('user_id', userId)
        .eq('platform', platform)
        .single<SocialCredentials>();

      if (error || !credentials) {
        return { platform, valid: false, reason: 'No credentials found' };
      }

      // Check if credentials are expired
      if (credentials && credentials.expires_at && new Date(credentials.expires_at) <= new Date()) {
        return { platform, valid: false, reason: 'Credentials expired' };
      }

      return { platform, valid: true };
    })
  );

  const invalidPlatforms = credentialChecks.filter(check => !check.valid);

  return {
    allValid: invalidPlatforms.length === 0,
    invalidPlatforms,
  };
}

function calculateEstimatedCompletion(platforms: string[]): string {
  // Estimate based on platform complexity and typical API response times
  const platformMinutes = {
    instagram: 5,
    tiktok: 3,
    youtube: 7,
  };

  const totalMinutes = platforms.reduce((sum, platform) => {
    return sum + (platformMinutes[platform as keyof typeof platformMinutes] || 5);
  }, 0);

  const completionTime = new Date(Date.now() + totalMinutes * 60 * 1000);
  return completionTime.toISOString();
}

async function storeCollectionJob(job: Record<string, unknown>) {
  // Store in database or job queue
  // For now, we'll store in memory or use a simple table
  console.log('Storing collection job:', job);
}

async function startPostCollection(job: { collection_id: string; platforms: string[]; user_id: string; date_range?: { start_date?: string; end_date?: string }; include_metrics: boolean }) {

  try {
    await updateCollectionStatus(job.collection_id, 'collecting', 10, 'Starting collection...');

    for (let i = 0; i < job.platforms.length; i++) {
      const platform = job.platforms[i];
      const progress = 10 + (i * 80 / job.platforms.length);
      
      await updateCollectionStatus(
        job.collection_id, 
        'collecting', 
        progress, 
        `Collecting ${platform} posts...`,
        platform
      );

      // Collect posts for this platform
      const posts = await collectPlatformPosts(job.user_id, platform, job.date_range, job.include_metrics);
      
      // Store posts in database
      if (posts.length > 0) {
        await storePosts(posts);
      }

      // Update progress
      const completedProgress = 10 + ((i + 1) * 80 / job.platforms.length);
      await updateCollectionStatus(
        job.collection_id, 
        'collecting', 
        completedProgress, 
        `Completed ${platform} (${posts.length} posts)`
      );
    }

    // Complete collection
    await updateCollectionStatus(job.collection_id, 'completed', 100, 'Collection completed');
    console.log(`Post collection ${job.collection_id} completed successfully`);

  } catch (error) {
    console.error(`Post collection ${job.collection_id} failed:`, error);
    await updateCollectionStatus(
      job.collection_id, 
      'failed', 
      null, 
      `Collection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function updateCollectionStatus(
  collectionId: string, 
  status: string, 
  progress?: number | null, 
  message?: string,
  _currentPlatform?: string
) {
  // Update collection status in database
  console.log(`Collection ${collectionId}: ${status} - ${progress}% - ${message}`);
}

async function collectPlatformPosts(
  userId: string, 
  platform: string, 
  _dateRange?: { start_date?: string; end_date?: string },
  _includeMetrics: boolean = true
) {
  // This would integrate with the existing data collection services
  // For now, return mock data
  
  const mockPosts = Array.from({ length: Math.floor(Math.random() * 20) + 5 }, (_, index) => ({
    user_id: userId,
    platform,
    post_id: `mock_${platform}_${index}_${Date.now()}`,
    platform_post_id: `${platform}_${Math.random().toString(36).substr(2, 9)}`,
    caption: `Sample ${platform} post content ${index + 1}`,
    hashtags: [`#${platform}`, '#content', '#sample'],
    media_type: 'image',
    media_url: `https://example.com/${platform}/media/${index}.jpg`,
    posted_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    likes: Math.floor(Math.random() * 1000),
    comments: Math.floor(Math.random() * 100),
    shares: Math.floor(Math.random() * 50),
    views: Math.floor(Math.random() * 5000),
    saves: Math.floor(Math.random() * 200),
    engagement_rate: Math.random() * 0.1,
    engagement_score: Math.random() * 100,
    raw_data: {
      collected_at: new Date().toISOString(),
      api_version: '1.0',
    },
  }));

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

  return mockPosts;
}

async function storePosts(posts: Record<string, unknown>[]) {
  const supabase = await createClient(cookies());

  try {
    // Insert posts in batches to avoid hitting limits
    const batchSize = 100;
    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('user_posts')
        .upsert(batch, { 
          onConflict: 'platform,platform_post_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Error storing posts batch:', error);
      }
    }

    console.log(`Successfully stored ${posts.length} posts`);

  } catch (error) {
    console.error('Error storing posts:', error);
    throw error;
  }
}

async function getCollectionStatus(collectionId: string, userId: string) {
  // Get collection status from database
  // For now, return mock data
  return {
    collection_id: collectionId,
    user_id: userId,
    status: 'completed',
    progress: 100,
    message: 'Collection completed successfully',
    platforms: ['instagram', 'tiktok'],
    started_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    completed_at: new Date().toISOString(),
    posts_collected: 25,
  };
}

async function getRecentCollections(_userId: string) {
  // Get recent collections from database
  // For now, return mock data
  return [
    {
      collection_id: 'collection_recent_1',
      status: 'completed',
      platforms: ['instagram'],
      started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      posts_collected: 15,
    },
    {
      collection_id: 'collection_recent_2',
      status: 'collecting',
      platforms: ['tiktok', 'youtube'],
      started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      progress: 65,
      current_platform: 'youtube',
    },
  ];
}
