/**
 * Audit Logging System
 * Tracks user actions, billing changes, and security events
 */

export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId: string;
  userEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'auth' | 'billing' | 'data' | 'admin' | 'security';
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface AuditLoggerConfig {
  enableConsoleLogging: boolean;
  enableDatabaseLogging: boolean;
  enableExternalLogging: boolean;
  retentionDays: number;
  sensitiveFields: string[];
  logLevels: string[];
}

export class AuditLogger {
  private static instance: AuditLogger;
  private config: AuditLoggerConfig;
  private eventQueue: AuditEvent[] = [];
  private isProcessing = false;

  constructor(config: Partial<AuditLoggerConfig> = {}) {
    this.config = {
      enableConsoleLogging: process.env.NODE_ENV === 'development',
      enableDatabaseLogging: true,
      enableExternalLogging: process.env.NODE_ENV === 'production',
      retentionDays: 90,
      sensitiveFields: ['password', 'token', 'secret', 'key', 'creditCard'],
      logLevels: ['low', 'medium', 'high', 'critical'],
      ...config
    };
  }

  static getInstance(config?: Partial<AuditLoggerConfig>): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger(config);
    }
    return AuditLogger.instance;
  }

  /**
   * Log an audit event
   */
  async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...event,
      details: this.sanitizeDetails(event.details)
    };

    // Add to queue for processing
    this.eventQueue.push(auditEvent);

    // Process queue if not already processing
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(
    userId: string,
    action: 'login' | 'logout' | 'register' | 'password_change' | 'mfa_enable' | 'mfa_disable',
    success: boolean,
    details: Record<string, any> = {},
    request?: { ip?: string; userAgent?: string }
  ): Promise<void> {
    await this.log({
      userId,
      userEmail: details.email,
      action,
      resource: 'authentication',
      details,
      ipAddress: request?.ip,
      userAgent: request?.userAgent,
      severity: success ? 'low' : 'high',
      category: 'auth',
      success,
      errorMessage: success ? undefined : details.error
    });
  }

  /**
   * Log billing events
   */
  async logBilling(
    userId: string,
    action: 'subscription_created' | 'subscription_updated' | 'subscription_cancelled' | 'payment_succeeded' | 'payment_failed' | 'invoice_created',
    resourceId: string,
    details: Record<string, any> = {},
    success: boolean = true
  ): Promise<void> {
    await this.log({
      userId,
      userEmail: details.email,
      action,
      resource: 'billing',
      resourceId,
      details: {
        ...details,
        amount: details.amount,
        currency: details.currency,
        planType: details.planType
      },
      severity: action.includes('failed') ? 'high' : 'medium',
      category: 'billing',
      success,
      errorMessage: success ? undefined : details.error
    });
  }

  /**
   * Log data access events
   */
  async logDataAccess(
    userId: string,
    action: 'read' | 'create' | 'update' | 'delete' | 'export' | 'import',
    resource: string,
    resourceId?: string,
    details: Record<string, any> = {},
    success: boolean = true
  ): Promise<void> {
    await this.log({
      userId,
      userEmail: details.email,
      action,
      resource,
      resourceId,
      details,
      severity: action === 'delete' ? 'high' : action === 'export' ? 'medium' : 'low',
      category: 'data',
      success,
      errorMessage: success ? undefined : details.error
    });
  }

  /**
   * Log admin actions
   */
  async logAdmin(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    details: Record<string, any> = {},
    success: boolean = true
  ): Promise<void> {
    await this.log({
      userId,
      userEmail: details.email,
      action,
      resource,
      resourceId,
      details,
      severity: 'high',
      category: 'admin',
      success,
      errorMessage: success ? undefined : details.error
    });
  }

  /**
   * Log security events
   */
  async logSecurity(
    userId: string,
    action: 'suspicious_activity' | 'rate_limit_exceeded' | 'unauthorized_access' | 'data_breach_attempt',
    details: Record<string, any> = {},
    request?: { ip?: string; userAgent?: string }
  ): Promise<void> {
    await this.log({
      userId,
      userEmail: details.email,
      action,
      resource: 'security',
      details,
      ipAddress: request?.ip,
      userAgent: request?.userAgent,
      severity: 'critical',
      category: 'security',
      success: false,
      errorMessage: details.error
    });
  }

  /**
   * Process the event queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const events = [...this.eventQueue];
      this.eventQueue = [];

      // Process events in parallel
      await Promise.all([
        this.logToConsole(events),
        this.logToDatabase(events),
        this.logToExternal(events)
      ]);
    } catch (error) {
      console.error('Error processing audit log queue:', error);
      // Re-add events to queue for retry
      this.eventQueue.unshift(...this.eventQueue);
    } finally {
      this.isProcessing = false;

      // Process any new events that were added during processing
      if (this.eventQueue.length > 0) {
        setTimeout(() => this.processQueue(), 1000);
      }
    }
  }

  /**
   * Log to console (development)
   */
  private async logToConsole(events: AuditEvent[]): Promise<void> {
    if (!this.config.enableConsoleLogging) return;

    events.forEach(event => {
      const logLevel = event.severity === 'critical' ? 'error' : 
                     event.severity === 'high' ? 'warn' : 'info';
      
      console[logLevel](`[AUDIT] ${event.action} on ${event.resource}`, {
        userId: event.userId,
        success: event.success,
        timestamp: event.timestamp,
        details: event.details
      });
    });
  }

  /**
   * Log to database
   */
  private async logToDatabase(events: AuditEvent[]): Promise<void> {
    if (!this.config.enableDatabaseLogging) return;

    try {
      // In a real implementation, this would use your database client
      // For now, we'll simulate the database operation
      const batchInsert = events.map(event => ({
        id: event.id,
        timestamp: event.timestamp,
        user_id: event.userId,
        user_email: event.userEmail,
        action: event.action,
        resource: event.resource,
        resource_id: event.resourceId,
        details: JSON.stringify(event.details),
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        session_id: event.sessionId,
        severity: event.severity,
        category: event.category,
        success: event.success,
        error_message: event.errorMessage,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null
      }));

      // Simulate database insert
      console.log(`[AUDIT DB] Inserting ${batchInsert.length} audit events`);
      
      // In production, you would do something like:
      // await db.auditLogs.insertMany(batchInsert);
    } catch (error) {
      console.error('Failed to log to database:', error);
      throw error;
    }
  }

  /**
   * Log to external service (production)
   */
  private async logToExternal(events: AuditEvent[]): Promise<void> {
    if (!this.config.enableExternalLogging) return;

    try {
      // In production, this would send to external logging service
      // like DataDog, Splunk, or CloudWatch
      const payload = {
        events: events.map(event => ({
          ...event,
          timestamp: event.timestamp.toISOString()
        })),
        source: 'team-dashboard',
        environment: process.env.NODE_ENV
      };

      console.log(`[AUDIT EXTERNAL] Sending ${events.length} events to external service`);
      
      // Simulate external API call
      // await fetch('/api/external-audit-log', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload)
      // });
    } catch (error) {
      console.error('Failed to log to external service:', error);
      // Don't throw here to avoid blocking other logging methods
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize sensitive data from details
   */
  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized = { ...details };

    this.config.sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filters: {
    userId?: string;
    action?: string;
    resource?: string;
    category?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ events: AuditEvent[]; total: number }> {
    // In production, this would query the database
    // For now, return mock data
    return {
      events: [],
      total: 0
    };
  }

  /**
   * Clean up old audit logs
   */
  async cleanup(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    try {
      // In production, this would delete old records from database
      console.log(`[AUDIT CLEANUP] Cleaning up logs older than ${cutoffDate.toISOString()}`);
      
      // await db.auditLogs.deleteMany({
      //   timestamp: { $lt: cutoffDate }
      // });
    } catch (error) {
      console.error('Failed to cleanup audit logs:', error);
    }
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();

// Middleware for Express.js
export function auditMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    // Capture original end function
    const originalEnd = res.end;
    
    res.end = function(...args: any[]) {
      const duration = Date.now() - startTime;
      const userId = req.user?.id || 'anonymous';
      const userEmail = req.user?.email;
      
      // Log the request
      auditLogger.logDataAccess(
        userId,
        req.method.toLowerCase() as any,
        req.path,
        req.params?.id,
        {
          email: userEmail,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          query: req.query,
          body: req.body ? Object.keys(req.body) : undefined
        },
        res.statusCode < 400
      ).catch(error => {
        console.error('Audit logging failed:', error);
      });
      
      // Call original end function
      originalEnd.apply(this, args);
    };
    
    next();
  };
} 