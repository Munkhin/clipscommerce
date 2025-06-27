/**
 * Real-time WebSocket service for autoposting workflow updates
 * Provides live updates for queue status, post scheduling, and performance metrics
 */

import { EventEmitter } from 'events';

export interface RealtimeUpdate {
  type: 'queue_update' | 'post_scheduled' | 'post_published' | 'post_failed' | 'metrics_update' | 'health_alert' | 'system_status';
  timestamp: Date;
  data: any;
  userId?: string;
  teamId?: string;
}

export interface WebSocketConnection {
  id: string;
  userId: string;
  teamId?: string;
  isAuthenticated: boolean;
  lastPing: Date;
  subscriptions: Set<string>;
}

export interface RealtimeConfig {
  maxConnections: number;
  pingInterval: number;
  connectionTimeout: number;
  enableCompression: boolean;
  enableHeartbeat: boolean;
}

export class RealtimeService extends EventEmitter {
  private connections: Map<string, WebSocketConnection> = new Map();
  private config: RealtimeConfig;
  private isRunning = false;
  private pingInterval?: NodeJS.Timeout;
  private updateQueue: RealtimeUpdate[] = [];
  private processingQueue = false;

  constructor(config: Partial<RealtimeConfig> = {}) {
    super();
    
    this.config = {
      maxConnections: 1000,
      pingInterval: 30000, // 30 seconds
      connectionTimeout: 60000, // 1 minute
      enableCompression: true,
      enableHeartbeat: true,
      ...config
    };
  }

  /**
   * Start the real-time service
   */
  start(): void {
    if (this.isRunning) {
      console.log('RealtimeService is already running');
      return;
    }

    this.isRunning = true;
    
    if (this.config.enableHeartbeat) {
      this.startHeartbeat();
    }

    // Start processing update queue
    this.processUpdateQueue();
    
    console.log('RealtimeService started');
    this.emit('service_started');
  }

  /**
   * Stop the real-time service
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Disconnect all connections
    this.connections.forEach((connection, id) => {
      this.disconnectUser(id);
    });

    console.log('RealtimeService stopped');
    this.emit('service_stopped');
  }

  /**
   * Connect a user to the real-time service
   */
  connectUser(userId: string, teamId?: string): string {
    // Check connection limits
    if (this.connections.size >= this.config.maxConnections) {
      throw new Error('Maximum connections reached');
    }

    const connectionId = this.generateConnectionId();
    const connection: WebSocketConnection = {
      id: connectionId,
      userId,
      teamId,
      isAuthenticated: true,
      lastPing: new Date(),
      subscriptions: new Set()
    };

    this.connections.set(connectionId, connection);
    
    console.log(`User ${userId} connected with connection ID: ${connectionId}`);
    
    // Send initial connection acknowledgment
    this.sendToConnection(connectionId, {
      type: 'system_status',
      timestamp: new Date(),
      data: {
        connected: true,
        connectionId,
        serverTime: new Date(),
        availableSubscriptions: this.getAvailableSubscriptions()
      }
    });

    this.emit('user_connected', { userId, connectionId, teamId });
    
    return connectionId;
  }

  /**
   * Disconnect a user from the real-time service
   */
  disconnectUser(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    this.connections.delete(connectionId);
    
    console.log(`User ${connection.userId} disconnected (${connectionId})`);
    
    this.emit('user_disconnected', { 
      userId: connection.userId, 
      connectionId,
      teamId: connection.teamId 
    });
  }

  /**
   * Subscribe a connection to specific update types
   */
  subscribe(connectionId: string, subscriptions: string[]): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    subscriptions.forEach(sub => connection.subscriptions.add(sub));
    
    console.log(`Connection ${connectionId} subscribed to: ${subscriptions.join(', ')}`);
    
    // Send subscription confirmation
    this.sendToConnection(connectionId, {
      type: 'system_status',
      timestamp: new Date(),
      data: {
        subscribed: subscriptions,
        activeSubscriptions: Array.from(connection.subscriptions)
      }
    });

    return true;
  }

  /**
   * Unsubscribe a connection from specific update types
   */
  unsubscribe(connectionId: string, subscriptions: string[]): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    subscriptions.forEach(sub => connection.subscriptions.delete(sub));
    
    console.log(`Connection ${connectionId} unsubscribed from: ${subscriptions.join(', ')}`);
    
    return true;
  }

  /**
   * Broadcast an update to all relevant connections
   */
  broadcast(update: Omit<RealtimeUpdate, 'timestamp'>): void {
    const fullUpdate: RealtimeUpdate = {
      ...update,
      timestamp: new Date()
    };

    // Add to queue for processing
    this.updateQueue.push(fullUpdate);
    
    // Process immediately if not already processing
    if (!this.processingQueue) {
      this.processUpdateQueue();
    }
  }

  /**
   * Send an update to a specific user
   */
  sendToUser(userId: string, update: Omit<RealtimeUpdate, 'timestamp'>): boolean {
    const fullUpdate: RealtimeUpdate = {
      ...update,
      timestamp: new Date(),
      userId
    };

    const userConnections = Array.from(this.connections.values())
      .filter(conn => conn.userId === userId);

    if (userConnections.length === 0) {
      return false;
    }

    userConnections.forEach(connection => {
      this.sendToConnection(connection.id, fullUpdate);
    });

    return true;
  }

  /**
   * Send an update to a specific team
   */
  sendToTeam(teamId: string, update: Omit<RealtimeUpdate, 'timestamp'>): boolean {
    const fullUpdate: RealtimeUpdate = {
      ...update,
      timestamp: new Date(),
      teamId
    };

    const teamConnections = Array.from(this.connections.values())
      .filter(conn => conn.teamId === teamId);

    if (teamConnections.length === 0) {
      return false;
    }

    teamConnections.forEach(connection => {
      this.sendToConnection(connection.id, fullUpdate);
    });

    return true;
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    connectionsByTeam: Record<string, number>;
    queueLength: number;
    isRunning: boolean;
  } {
    const connectionsByTeam: Record<string, number> = {};
    
    this.connections.forEach(connection => {
      if (connection.teamId) {
        connectionsByTeam[connection.teamId] = (connectionsByTeam[connection.teamId] || 0) + 1;
      }
    });

    return {
      totalConnections: this.connections.size,
      connectionsByTeam,
      queueLength: this.updateQueue.length,
      isRunning: this.isRunning
    };
  }

  /**
   * Health check for the real-time service
   */
  healthCheck(): {
    status: 'healthy' | 'warning' | 'critical';
    details: any;
  } {
    const stats = this.getStats();
    const now = new Date();
    
    // Check for stale connections
    const staleConnections = Array.from(this.connections.values())
      .filter(conn => now.getTime() - conn.lastPing.getTime() > this.config.connectionTimeout);

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (stats.queueLength > 1000 || staleConnections.length > 50) {
      status = 'critical';
    } else if (stats.queueLength > 100 || staleConnections.length > 10) {
      status = 'warning';
    }

    return {
      status,
      details: {
        ...stats,
        staleConnections: staleConnections.length,
        config: this.config,
        uptime: this.isRunning ? 'running' : 'stopped'
      }
    };
  }

  // Private methods

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sendToConnection(connectionId: string, update: RealtimeUpdate): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    // Check if connection is subscribed to this update type
    if (connection.subscriptions.size > 0 && !connection.subscriptions.has(update.type)) {
      return;
    }

    try {
      // In a real implementation, this would send through WebSocket
      // For now, we'll emit an event that can be captured by the frontend
      this.emit('message', {
        connectionId,
        userId: connection.userId,
        teamId: connection.teamId,
        update
      });
      
      console.log(`Sent ${update.type} update to connection ${connectionId}`);
    } catch (error) {
      console.error(`Failed to send message to connection ${connectionId}:`, error);
      // Remove stale connection
      this.disconnectUser(connectionId);
    }
  }

  private async processUpdateQueue(): Promise<void> {
    if (this.processingQueue || this.updateQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    try {
      while (this.updateQueue.length > 0) {
        const update = this.updateQueue.shift()!;
        await this.processUpdate(update);
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } finally {
      this.processingQueue = false;
    }
  }

  private async processUpdate(update: RealtimeUpdate): Promise<void> {
    try {
      // Filter connections based on update context
      let targetConnections = Array.from(this.connections.values());

      // Filter by user if specified
      if (update.userId) {
        targetConnections = targetConnections.filter(conn => conn.userId === update.userId);
      }

      // Filter by team if specified
      if (update.teamId) {
        targetConnections = targetConnections.filter(conn => conn.teamId === update.teamId);
      }

      // Send to all target connections
      targetConnections.forEach(connection => {
        this.sendToConnection(connection.id, update);
      });

    } catch (error) {
      console.error('Error processing update:', error);
    }
  }

  private startHeartbeat(): void {
    this.pingInterval = setInterval(() => {
      const now = new Date();
      const timeoutThreshold = now.getTime() - this.config.connectionTimeout;

      // Remove stale connections
      const staleConnections: string[] = [];
      this.connections.forEach((connection, id) => {
        if (connection.lastPing.getTime() < timeoutThreshold) {
          staleConnections.push(id);
        }
      });

      staleConnections.forEach(id => {
        console.log(`Removing stale connection: ${id}`);
        this.disconnectUser(id);
      });

      // Send ping to active connections
      this.connections.forEach((connection, id) => {
        this.sendToConnection(id, {
          type: 'system_status',
          timestamp: new Date(),
          data: { ping: true, serverTime: now }
        });
      });

    }, this.config.pingInterval);
  }

  private getAvailableSubscriptions(): string[] {
    return [
      'queue_update',
      'post_scheduled',
      'post_published',
      'post_failed',
      'metrics_update',
      'health_alert',
      'system_status'
    ];
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService({
  enableHeartbeat: true,
  enableCompression: true,
  maxConnections: 1000,
  pingInterval: 30000,
  connectionTimeout: 60000
});