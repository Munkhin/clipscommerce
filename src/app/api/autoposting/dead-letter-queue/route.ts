import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { RetryService } from '../../../workflows/autoposting/RetryService';
import { MonitoringService } from '../../../workflows/autoposting/Monitoring';

// Initialize services
const monitoring = new MonitoringService();
const retryService = new RetryService(monitoring);

const resolveItemSchema = z.object({
  item_id: z.string().uuid('Invalid item ID'),
  resolution_notes: z.string().min(1, 'Resolution notes are required'),
  action: z.enum(['resolve', 'retry', 'delete']).optional().default('resolve'),
});

const bulkActionSchema = z.object({
  item_ids: z.array(z.string().uuid()).min(1, 'At least one item ID is required'),
  action: z.enum(['resolve', 'retry', 'delete']),
  resolution_notes: z.string().optional(),
});

// GET - Get dead letter queue items
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const resolved = searchParams.get('resolved') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('autopost_dead_letter_queue')
      .select('*')
      .eq('user_id', user.id)
      .order('moved_to_dlq_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (platform) {
      query = query.eq('platform', platform);
    }

    if (resolved) {
      query = query.not('resolved_at', 'is', null);
    } else {
      query = query.is('resolved_at', null);
    }

    const { data: dlqItems, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch dead letter queue items' }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('autopost_dead_letter_queue')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (platform) {
      countQuery = countQuery.eq('platform', platform);
    }

    if (resolved) {
      countQuery = countQuery.not('resolved_at', 'is', null);
    } else {
      countQuery = countQuery.is('resolved_at', null);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error getting DLQ count:', countError);
    }

    // Get statistics
    const { data: statsData, error: statsError } = await supabase
      .from('autopost_dead_letter_queue')
      .select('platform, failure_reason, resolved_at')
      .eq('user_id', user.id);

    const stats = {
      total: statsData?.length || 0,
      unresolved: statsData?.filter(item => !item.resolved_at).length || 0,
      resolved: statsData?.filter(item => item.resolved_at).length || 0,
      by_platform: {} as Record<string, number>,
      by_failure_reason: {} as Record<string, number>,
    };

    statsData?.forEach(item => {
      stats.by_platform[item.platform] = (stats.by_platform[item.platform] || 0) + 1;
      stats.by_failure_reason[item.failure_reason] = (stats.by_failure_reason[item.failure_reason] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      items: dlqItems || [],
      statistics: stats,
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit,
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching dead letter queue:', error);
    return NextResponse.json({ error: 'Failed to fetch dead letter queue' }, { status: 500 });
  }
}

// POST - Resolve or retry a dead letter queue item
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = resolveItemSchema.parse(body);

    // Verify the item belongs to the authenticated user
    const { data: dlqItem, error: fetchError } = await supabase
      .from('autopost_dead_letter_queue')
      .select('*')
      .eq('id', validatedData.item_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !dlqItem) {
      return NextResponse.json({ 
        error: 'Dead letter queue item not found or access denied' 
      }, { status: 404 });
    }

    if (dlqItem.resolved_at) {
      return NextResponse.json({ 
        error: 'Item has already been resolved' 
      }, { status: 400 });
    }

    switch (validatedData.action) {
      case 'resolve':
        return await resolveItem(supabase, validatedData.item_id, validatedData.resolution_notes);
      
      case 'retry':
        return await retryItemFromDLQ(supabase, dlqItem, validatedData.resolution_notes);
      
      case 'delete':
        return await deleteItemFromDLQ(supabase, validatedData.item_id, validatedData.resolution_notes);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error managing dead letter queue item:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to manage dead letter queue item' }, { status: 500 });
  }
}

// PUT - Bulk action on dead letter queue items
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = bulkActionSchema.parse(body);

    // Verify all items belong to the authenticated user
    const { data: dlqItems, error: fetchError } = await supabase
      .from('autopost_dead_letter_queue')
      .select('*')
      .in('id', validatedData.item_ids)
      .eq('user_id', user.id)
      .is('resolved_at', null); // Only process unresolved items

    if (fetchError) {
      return NextResponse.json({ 
        error: 'Failed to fetch dead letter queue items' 
      }, { status: 500 });
    }

    if (!dlqItems || dlqItems.length === 0) {
      return NextResponse.json({ 
        error: 'No unresolved items found or access denied' 
      }, { status: 404 });
    }

    const results = [];
    for (const item of dlqItems) {
      try {
        let result;
        switch (validatedData.action) {
          case 'resolve':
            result = await resolveItem(supabase, item.id, validatedData.resolution_notes || 'Bulk resolution');
            break;
          
          case 'retry':
            result = await retryItemFromDLQ(supabase, item, validatedData.resolution_notes || 'Bulk retry');
            break;
          
          case 'delete':
            result = await deleteItemFromDLQ(supabase, item.id, validatedData.resolution_notes || 'Bulk deletion');
            break;
        }

        results.push({
          item_id: item.id,
          platform: item.platform,
          success: true,
          action: validatedData.action
        });
      } catch (error) {
        results.push({
          item_id: item.id,
          platform: item.platform,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          action: validatedData.action
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      message: `Bulk ${validatedData.action} completed: ${successCount} successful, ${failureCount} failed`,
      results,
      summary: {
        total_requested: validatedData.item_ids.length,
        items_processed: dlqItems.length,
        successful: successCount,
        failed: failureCount
      }
    });

  } catch (error) {
    console.error('Bulk DLQ action error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to process bulk action' }, { status: 500 });
  }
}

// Helper function to resolve an item
async function resolveItem(supabase: any, itemId: string, resolutionNotes: string) {
  const { data: resolvedItem, error } = await supabase
    .from('autopost_dead_letter_queue')
    .update({
      resolved_at: new Date().toISOString(),
      resolution_notes: resolutionNotes
    })
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to resolve item: ${error.message}`);
  }

  return NextResponse.json({
    success: true,
    message: 'Item resolved successfully',
    resolved_item: resolvedItem
  });
}

// Helper function to retry an item from DLQ
async function retryItemFromDLQ(supabase: any, dlqItem: any, resolutionNotes: string) {
  // Create a new scheduled post from the DLQ item
  const { data: newPost, error: insertError } = await supabase
    .from('autopost_schedule')
    .insert({
      user_id: dlqItem.user_id,
      platform: dlqItem.platform,
      content: dlqItem.content,
      media_urls: dlqItem.media_urls,
      post_time: new Date().toISOString(), // Schedule for immediate posting
      status: 'scheduled',
      retry_count: 0,
      max_retries: 3,
      retry_delay: 30000,
      priority: 'high', // High priority for DLQ retries
      metadata: {
        ...dlqItem.metadata,
        dlq_retry: true,
        original_dlq_id: dlqItem.id,
        dlq_retry_at: new Date().toISOString()
      }
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to create retry post: ${insertError.message}`);
  }

  // Mark DLQ item as resolved
  const { error: resolveError } = await supabase
    .from('autopost_dead_letter_queue')
    .update({
      resolved_at: new Date().toISOString(),
      resolution_notes: `${resolutionNotes} - Retried as post ${newPost.id}`
    })
    .eq('id', dlqItem.id);

  if (resolveError) {
    throw new Error(`Failed to resolve DLQ item: ${resolveError.message}`);
  }

  return NextResponse.json({
    success: true,
    message: 'Item retried successfully',
    new_post: newPost,
    resolved_dlq_item: dlqItem.id
  });
}

// Helper function to delete an item from DLQ
async function deleteItemFromDLQ(supabase: any, itemId: string, resolutionNotes: string) {
  // Soft delete by marking as resolved with deletion note
  const { data: deletedItem, error } = await supabase
    .from('autopost_dead_letter_queue')
    .update({
      resolved_at: new Date().toISOString(),
      resolution_notes: `DELETED: ${resolutionNotes}`
    })
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to delete item: ${error.message}`);
  }

  return NextResponse.json({
    success: true,
    message: 'Item deleted successfully',
    deleted_item: deletedItem
  });
}