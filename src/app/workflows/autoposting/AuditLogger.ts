export class AuditLogger {
  private logs: { timestamp: Date; action: string; user?: string; details?: any }[] = [];

  log(action: string, user?: string, details?: any) {
    this.logs.push({ timestamp: new Date(), action, user, details });
  }

  getLogs(user?: string) {
    // Only return logs for the user or all if admin
    if (!user) return this.logs;
    return this.logs.filter(log => log.user === user);
  }

  verifyIntegrity(): boolean {
    // Simple integrity check: timestamps are in order
    for (let i = 1; i < this.logs.length; i++) {
      if (this.logs[i].timestamp < this.logs[i - 1].timestamp) return false;
    }
    return true;
  }
} 