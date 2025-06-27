import { Platform } from '../../workflows/deliverables/types/deliverables_types';

interface Credential {
  platform: Platform;
  userId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export class SecureCredentialsStore {
  private store: Map<string, Credential> = new Map();
  private auditLog: string[] = [];

  setCredential(cred: Credential) {
    const key = `${cred.platform}:${cred.userId}`;
    this.store.set(key, cred);
    this.logAudit(`Set credential for ${key}`);
  }

  getCredential(platform: Platform, userId: string): Credential | undefined {
    const key = `${platform}:${userId}`;
    this.logAudit(`Accessed credential for ${key}`);
    return this.store.get(key);
  }

  removeCredential(platform: Platform, userId: string) {
    const key = `${platform}:${userId}`;
    this.store.delete(key);
    this.logAudit(`Removed credential for ${key}`);
  }

  logAudit(entry: string) {
    // Stub: write to secure audit log
    this.auditLog.push(`${new Date().toISOString()}: ${entry}`);
  }

  getAuditLog(): string[] {
    return this.auditLog;
  }
} 