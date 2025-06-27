/**
 * Alert management system for monitoring performance issues and thresholds
 */
import EventEmitter from 'events';

// Alert severity levels
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

// Alert type definition
export interface Alert {
  id: string;
  type: string;
  message: string;
  severity: AlertSeverity;
  source: string;
  timestamp: Date;
  details: Record<string, any>;
  acknowledged: boolean;
}

// Alert handler interface
export interface AlertHandler {
  handleAlert(alert: Alert): Promise<void>;
}

// Console alert handler for development
class ConsoleAlertHandler implements AlertHandler {
  async handleAlert(alert: Alert): Promise<void> {
    const color = {
      info: '\x1b[34m',     // Blue
      warning: '\x1b[33m',  // Yellow
      error: '\x1b[31m',    // Red
      critical: '\x1b[41m', // Red background
    }[alert.severity];
    
    console.log(
      `${color}[${alert.severity.toUpperCase()}]\x1b[0m [${alert.source}] ${alert.message}`,
      alert.details
    );
  }
}

// Alert manager configuration
export interface AlertManagerConfig {
  environment: 'development' | 'test' | 'production';
  serviceName: string;
  deduplicationWindow?: number; // in milliseconds
}

// Alert grouping options
export interface AlertGroupOptions {
  groupByType?: boolean;
  groupBySource?: boolean;
  maxAlertsPerGroup?: number;
}

// Alert manager implementation
export class AlertManager {
  private readonly environment: string;
  private readonly serviceName: string;
  private readonly handlers: AlertHandler[] = [];
  private readonly activeAlerts: Map<string, Alert> = new Map();
  private readonly alertHistory: Alert[] = [];
  private readonly eventEmitter = new EventEmitter();
  private readonly deduplicationWindow: number;
  private readonly maxHistorySize = 1000;
  private alertCount: Record<AlertSeverity, number> = {
    info: 0,
    warning: 0,
    error: 0,
    critical: 0
  };
  
  constructor(config: AlertManagerConfig) {
    this.environment = config.environment;
    this.serviceName = config.serviceName;
    this.deduplicationWindow = config.deduplicationWindow || 60000; // 1 minute default
    
    // Add default console handler for development
    if (config.environment === 'development') {
      this.addHandler(new ConsoleAlertHandler());
    }
  }

  addHandler(handler: AlertHandler): void {
    this.handlers.push(handler);
  }

  async fireAlert(
    type: string,
    message: string,
    severity: AlertSeverity,
    details: Record<string, any> = {}
  ): Promise<Alert> {
    // Generate alert ID based on type and source
    const alertKey = `${type}:${this.serviceName}:${JSON.stringify(details)}`;
    
    // Check for duplicate alerts in deduplication window
    const existingAlert = this.activeAlerts.get(alertKey);
    if (existingAlert && (Date.now() - existingAlert.timestamp.getTime() < this.deduplicationWindow)) {
      return existingAlert;
    }
    
    const alert: Alert = {
      id: this.generateId(),
      type,
      message,
      severity,
      source: this.serviceName,
      timestamp: new Date(),
      details,
      acknowledged: false
    };
    
    // Store active alert
    this.activeAlerts.set(alertKey, alert);
    
    // Update alert count
    this.alertCount[severity]++;
    
    // Add to history
    this.alertHistory.push(alert);
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory.shift();
    }
    
    // Process through all handlers
    const promises = this.handlers.map(handler => handler.handleAlert(alert));
    await Promise.all(promises);
    
    // Emit event
    this.eventEmitter.emit('alert', alert);
    
    return alert;
  }

  acknowledgeAlert(alertId: string): boolean {
    // Find alert in active alerts
    for (const [key, alert] of this.activeAlerts.entries()) {
      if (alert.id === alertId) {
        alert.acknowledged = true;
        this.activeAlerts.set(key, alert);
        this.eventEmitter.emit('alert.acknowledged', alert);
        return true;
      }
    }
    
    // Find in history
    for (const alert of this.alertHistory) {
      if (alert.id === alertId) {
        alert.acknowledged = true;
        this.eventEmitter.emit('alert.acknowledged', alert);
        return true;
      }
    }
    
    return false;
  }

  resolveAlert(alertId: string): boolean {
    // Find and remove from active alerts
    for (const [key, alert] of this.activeAlerts.entries()) {
      if (alert.id === alertId) {
        this.activeAlerts.delete(key);
        
        // Update alert count
        this.alertCount[alert.severity]--;
        
        this.eventEmitter.emit('alert.resolved', alert);
        return true;
      }
    }
    
    return false;
  }

  getActiveAlerts(severity?: AlertSeverity): Alert[] {
    const alerts = Array.from(this.activeAlerts.values());
    
    if (severity) {
      return alerts.filter(alert => alert.severity === severity);
    }
    
    return alerts;
  }

  getAlertHistory(options: { 
    severity?: AlertSeverity, 
    since?: Date,
    limit?: number 
  } = {}): Alert[] {
    let alerts = [...this.alertHistory];
    
    if (options.severity) {
      alerts = alerts.filter(alert => alert.severity === options.severity);
    }
    
    if (options.since) {
      alerts = alerts.filter(alert => alert.timestamp >= options.since!);
    }
    
    // Sort by timestamp (newest first)
    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (options.limit) {
      alerts = alerts.slice(0, options.limit);
    }
    
    return alerts;
  }

  getAlertCount(): Record<AlertSeverity, number> {
    return { ...this.alertCount };
  }

  groupAlerts(alerts: Alert[], options: AlertGroupOptions = {}): Record<string, Alert[]> {
    const groups: Record<string, Alert[]> = {};
    
    for (const alert of alerts) {
      let groupKey = '';
      
      if (options.groupByType) {
        groupKey += alert.type;
      }
      
      if (options.groupBySource) {
        groupKey += (groupKey ? ':' : '') + alert.source;
      }
      
      // Default group if no grouping options
      if (!groupKey) {
        groupKey = 'default';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      
      // Respect max alerts per group
      if (!options.maxAlertsPerGroup || groups[groupKey].length < options.maxAlertsPerGroup) {
        groups[groupKey].push(alert);
      }
    }
    
    return groups;
  }

  on(event: 'alert' | 'alert.acknowledged' | 'alert.resolved', handler: (alert: Alert) => void): void {
    this.eventEmitter.on(event, handler);
  }

  off(event: 'alert' | 'alert.acknowledged' | 'alert.resolved', handler: (alert: Alert) => void): void {
    this.eventEmitter.off(event, handler);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

// Create a default alert manager for development
export const createDevAlertManager = (serviceName: string) => 
  new AlertManager({
    serviceName,
    environment: 'development'
  });
