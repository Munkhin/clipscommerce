// User-related types
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  preferences?: UserPreferences;
}

export type UserRole = 'admin' | 'user' | 'moderator' | 'viewer';

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  notifications?: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  dashboard?: {
    layout: string;
    widgets: string[];
  };
}

export interface UserSession {
  userId: string;
  sessionId: string;
  expiresAt: Date;
  createdAt: Date;
  deviceInfo?: {
    userAgent: string;
    ip: string;
    location?: string;
  };
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  resource?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}