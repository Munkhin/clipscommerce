/**
 * WebSocket API route for real-time autoposting updates
 * Handles WebSocket connections and real-time communication
 */

import { NextRequest } from 'next/server';
import { realtimeService } from '@/app/workflows/autoposting/RealtimeService';
import { rateLimit } from '@/lib/rate-limit';

// In a real implementation, you would use a WebSocket library like ws or socket.io
// For now, we'll create a Server-Sent Events (SSE) endpoint as an alternative

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit('websocket-connect');
    if (!rateLimitResult.success) {
      return new Response('Too many connection attempts', { status: 429 });
    }

    // Get user info from headers (in production, validate JWT token)
    const userId = request.headers.get('x-user-id');
    const teamId = request.headers.get('x-team-id');

    if (!userId) {
      return new Response('Authentication required', { status: 401 });
    }

    // Create Server-Sent Events response
    const encoder = new TextEncoder();
    
    const customReadable = new ReadableStream({
      start(controller) {
        // Connect user to real-time service
        const connectionId = realtimeService.connectUser(userId, teamId || undefined);
        
        // Send initial connection message
        const initialData = {
          type: 'connection_established',
          connectionId,
          timestamp: new Date(),
          data: {
            userId,
            teamId,
            availableSubscriptions: [
              'queue_update',
              'post_scheduled',
              'post_published',
              'post_failed',
              'metrics_update',
              'health_alert'
            ]
          }
        };
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`));

        // Listen for messages from the real-time service
        const messageHandler = (message: any) => {
          if (message.connectionId === connectionId) {
            const sseData = `data: ${JSON.stringify(message.update)}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          }
        };

        realtimeService.on('message', messageHandler);

        // Handle connection cleanup
        const cleanup = () => {
          realtimeService.off('message', messageHandler);
          realtimeService.disconnectUser(connectionId);
        };

        // Cleanup on close
        request.signal.addEventListener('abort', cleanup);
        
        // Keep alive ping every 30 seconds
        const keepAlive = setInterval(() => {
          if (request.signal.aborted) {
            clearInterval(keepAlive);
            cleanup();
            return;
          }
          
          const pingData = {
            type: 'ping',
            timestamp: new Date(),
            data: { connectionId }
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(pingData)}\n\n`));
        }, 30000);

        // Cleanup on interval end
        setTimeout(() => {
          clearInterval(keepAlive);
          cleanup();
          controller.close();
        }, 600000); // 10 minutes max connection time
      }
    });

    return new Response(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'x-user-id, x-team-id',
      },
    });

  } catch (error) {
    console.error('WebSocket connection error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit('websocket-action');
    if (!rateLimitResult.success) {
      return new Response('Too many requests', { status: 429 });
    }

    const body = await request.json();
    const { action, connectionId, data } = body;

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return new Response('Authentication required', { status: 401 });
    }

    switch (action) {
      case 'subscribe': {
        const subscriptions = data?.subscriptions || [];
        const subscribeSuccess = realtimeService.subscribe(connectionId, subscriptions);
        
        return Response.json({
          success: subscribeSuccess,
          message: subscribeSuccess ? 'Subscribed successfully' : 'Connection not found'
        });
      }
      case 'unsubscribe': {
        const unsubscriptions = data?.subscriptions || [];
        const unsubscribeSuccess = realtimeService.unsubscribe(connectionId, unsubscriptions);
        
        return Response.json({
          success: unsubscribeSuccess,
          message: unsubscribeSuccess ? 'Unsubscribed successfully' : 'Connection not found'
        });
      }
      case 'send_message':
        // Allow users to send custom messages (for testing or specific use cases)
        if (data?.targetUserId) {
          const sent = realtimeService.sendToUser(data.targetUserId, {
            type: 'custom_message',
            data: data.message
          });
          
          return Response.json({
            success: sent,
            message: sent ? 'Message sent' : 'Target user not connected'
          });
        }
        
        return Response.json({
          success: false,
          message: 'Target user ID required'
        });

      case 'get_stats': {
        const stats = realtimeService.getStats();
        return Response.json({
          success: true,
          data: stats
        });
      }
      case 'health_check': {
        const health = realtimeService.healthCheck();
        return Response.json({
          success: true,
          data: health
        });
      }
      default:
        return Response.json({
          success: false,
          message: 'Unknown action'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('WebSocket action error:', error);
    return Response.json({
      success: false,
      message: 'Internal Server Error'
    }, { status: 500 });
  }
}

// Handle preflight requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-user-id, x-team-id',
    },
  });
}