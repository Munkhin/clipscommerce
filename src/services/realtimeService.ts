'use client';

export type RealtimeUpdate = {
  type: 'post_status_update' | 'post_scheduled' | 'post_published' | 'post_failed' | 'connection_established' | 'ping';
  data: {
    postId?: string;
    status?: 'scheduled' | 'posted' | 'failed';
    platform?: string;
    timestamp?: string;
    message?: string;
    connectionId?: string;
    userId?: string;
    teamId?: string;
    availableSubscriptions?: string[];
  };
  timestamp: Date;
};

export type RealtimeSubscription = (update: RealtimeUpdate) => void;

class RealtimeService {
  private eventSource: EventSource | null = null;
  private subscriptions: Set<RealtimeSubscription> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private connectionId: string | null = null;
  private isConnecting = false;

  async connect(): Promise<string> {
    if (this.eventSource?.readyState === EventSource.OPEN) {
      return this.connectionId || '';
    }

    if (this.isConnecting) {
      // Wait for existing connection attempt
      return new Promise((resolve) => {
        const checkConnection = () => {
          if (!this.isConnecting) {
            resolve(this.connectionId || '');
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    this.isConnecting = true;

    try {
      // Close existing connection if any
      this.disconnect();

      this.eventSource = new EventSource('/api/autoposting/websocket');
      
      this.eventSource.onopen = () => {
        console.log('Real-time connection established');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.isConnecting = false;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const update: RealtimeUpdate = JSON.parse(event.data);
          
          // Store connection ID from initial connection
          if (update.type === 'connection_established' && update.data.connectionId) {
            this.connectionId = update.data.connectionId;
          }
          
          // Notify all subscribers
          this.subscriptions.forEach(callback => {
            try {
              callback(update);
            } catch (error) {
              console.error('Error in realtime subscription callback:', error);
            }
          });
        } catch (error) {
          console.error('Error parsing realtime message:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('Real-time connection error:', error);
        this.isConnecting = false;
        
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.attemptReconnect();
        }
      };

      // Wait for connection to be established
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.isConnecting = false;
          reject(new Error('Connection timeout'));
        }, 10000);

        const checkConnection = () => {
          if (this.connectionId) {
            clearTimeout(timeout);
            resolve(this.connectionId);
          } else if (!this.isConnecting) {
            clearTimeout(timeout);
            reject(new Error('Failed to establish connection'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });

    } catch (error) {
      this.isConnecting = false;
      console.error('Error establishing real-time connection:', error);
      throw error;
    }
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.connectionId = null;
    this.isConnecting = false;
  }

  subscribe(callback: RealtimeSubscription): () => void {
    this.subscriptions.add(callback);
    
    // Auto-connect if not already connected
    if (!this.eventSource || this.eventSource.readyState !== EventSource.OPEN) {
      this.connect().catch(error => {
        console.error('Failed to auto-connect for subscription:', error);
      });
    }

    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(callback);
    };
  }

  async subscribeToUpdates(subscriptions: string[]): Promise<boolean> {
    if (!this.connectionId) {
      throw new Error('Not connected to real-time service');
    }

    try {
      // Get CSRF token
      const csrfResponse = await fetch('/api/auth/csrf');
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch('/api/autoposting/websocket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          action: 'subscribe',
          connectionId: this.connectionId,
          data: { subscriptions },
        }),
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error subscribing to updates:', error);
      return false;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  // Simulate post status updates for testing
  simulatePostUpdate(postId: string, status: 'posted' | 'failed'): void {
    const update: RealtimeUpdate = {
      type: 'post_status_update',
      data: {
        postId,
        status,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date(),
    };

    this.subscriptions.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('Error in simulated update callback:', error);
      }
    });
  }

  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (this.isConnecting) return 'connecting';
    if (this.eventSource?.readyState === EventSource.OPEN) return 'connected';
    return 'disconnected';
  }

  getConnectionId(): string | null {
    return this.connectionId;
  }
}

export const realtimeService = new RealtimeService();