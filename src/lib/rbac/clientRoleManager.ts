/**
 * Client-Side Role-Based Access Control (RBAC) System
 * This version is safe to use in React components and browser environment
 */

import { createClient } from '@/lib/supabase/client';

export enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member'
}

export enum Permission {
  // User management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_INVITE = 'user:invite',
  
  // Team management
  TEAM_CREATE = 'team:create',
  TEAM_READ = 'team:read',
  TEAM_UPDATE = 'team:update',
  TEAM_DELETE = 'team:delete',
  TEAM_MANAGE_MEMBERS = 'team:manage_members',
  
  // Billing management
  BILLING_READ = 'billing:read',
  BILLING_UPDATE = 'billing:update',
  BILLING_CANCEL = 'billing:cancel',
  BILLING_EXPORT = 'billing:export',
  
  // Client management
  CLIENT_CREATE = 'client:create',
  CLIENT_READ = 'client:read',
  CLIENT_UPDATE = 'client:update',
  CLIENT_DELETE = 'client:delete',
  CLIENT_EXPORT = 'client:export',
  CLIENT_BULK_OPERATIONS = 'client:bulk_operations',
  
  // Analytics and reporting
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_EXPORT = 'analytics:export',
  ANALYTICS_ADVANCED = 'analytics:advanced',
  
  // System administration
  SYSTEM_SETTINGS = 'system:settings',
  SYSTEM_AUDIT_LOGS = 'system:audit_logs',
  SYSTEM_MONITORING = 'system:monitoring',
  
  // API access
  API_READ = 'api:read',
  API_WRITE = 'api:write',
  API_ADMIN = 'api:admin'
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  teamId?: string;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export class ClientRoleManager {
  private static instance: ClientRoleManager;
  private supabase = createClient();

  static getInstance(): ClientRoleManager {
    if (!ClientRoleManager.instance) {
      ClientRoleManager.instance = new ClientRoleManager();
    }
    return ClientRoleManager.instance;
  }

  /**
   * Get user's roles
   */
  async getUserRoles(userId: string, teamId?: string): Promise<UserRole[]> {
    try {
      let query = this.supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (teamId !== undefined) {
        query = query.eq('team_id', teamId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        // Check if the error is due to missing tables/schema
        if (error.code === 'PGRST116' || error.message?.includes('relation "user_roles" does not exist')) {
          console.warn('[RBAC] RBAC tables not found, returning empty roles. Please run database migrations.');
          return [];
        }
        throw error;
      }
      
      // Filter out expired roles
      const activeRoles = (data || []).filter(role => {
        if (!role.expires_at) return true;
        return new Date(role.expires_at) > new Date();
      });
      
      return activeRoles.map(role => ({
        id: role.id,
        userId: role.user_id,
        roleId: role.role_id,
        teamId: role.team_id,
        assignedBy: role.assigned_by,
        assignedAt: new Date(role.assigned_at),
        expiresAt: role.expires_at ? new Date(role.expires_at) : undefined,
        isActive: role.is_active
      }));
    } catch (error) {
      console.error(`[RBAC] Error getting user roles for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get user's highest role
   */
  async getUserHighestRole(userId: string, teamId?: string): Promise<Role | null> {
    try {
      let query = this.supabase
        .from('user_roles')
        .select('roles(name), expires_at')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (teamId !== undefined) {
        query = query.eq('team_id', teamId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        // Check if the error is due to missing tables/schema
        if (error.code === 'PGRST116' || error.message?.includes('relation "user_roles" does not exist')) {
          console.warn('[RBAC] RBAC tables not found, defaulting to member role. Please run database migrations.');
          return Role.MEMBER;
        }
        throw error;
      }
      
      if (!data || data.length === 0) {
        // If no roles found, default to member
        console.info(`[RBAC] No roles found for user ${userId}, defaulting to member role`);
        return Role.MEMBER;
      }
      
      // Filter out expired roles and get role names
      const roleNames = data
        .filter(userRole => {
          if (!userRole.expires_at) return true;
          return new Date(userRole.expires_at) > new Date();
        })
        .map(userRole => (userRole.roles as any)?.name)
        .filter(Boolean);
      
      // Role hierarchy: Admin > Manager > Member
      const roleHierarchy = [Role.ADMIN, Role.MANAGER, Role.MEMBER];
      
      for (const hierarchyRole of roleHierarchy) {
        if (roleNames.includes(hierarchyRole)) {
          return hierarchyRole;
        }
      }
      
      // If no valid role found, default to member
      return Role.MEMBER;
    } catch (error) {
      console.error(`[RBAC] Error getting user highest role for ${userId}:`, error);
      // Fallback to member role if there's any error
      return Role.MEMBER;
    }
  }

  /**
   * Check if user has permission
   */
  async hasPermission(userId: string, permission: Permission, teamId?: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('user_has_permission', {
        user_uuid: userId,
        permission_name: permission
      });
      
      if (error) {
        // Check if the error is due to missing function/tables
        if (error.code === 'PGRST202' || error.message?.includes('function user_has_permission') || error.message?.includes('relation "user_roles" does not exist')) {
          console.warn(`[RBAC] RBAC functions not found, defaulting permission ${permission} to false. Please run database migrations.`);
          return false;
        }
        console.error(`[RBAC] Error checking permission ${permission} for user ${userId}:`, error);
        return false;
      }
      
      return data || false;
    } catch (error) {
      console.error(`[RBAC] Error checking permission ${permission} for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string, teamId?: string): Promise<Permission[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_user_permissions', {
        user_uuid: userId
      });
      
      if (error) {
        // Check if the error is due to missing function/tables
        if (error.code === 'PGRST202' || error.message?.includes('function get_user_permissions') || error.message?.includes('relation "user_roles" does not exist')) {
          console.warn(`[RBAC] RBAC functions not found, returning empty permissions. Please run database migrations.`);
          return [];
        }
        console.error(`[RBAC] Error getting permissions for user ${userId}:`, error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error(`[RBAC] Error getting permissions for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(userId: string, permissions: Permission[], teamId?: string): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.hasPermission(userId, permission, teamId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has all of the specified permissions
   */
  async hasAllPermissions(userId: string, permissions: Permission[], teamId?: string): Promise<boolean> {
    for (const permission of permissions) {
      if (!(await this.hasPermission(userId, permission, teamId))) {
        return false;
      }
    }
    return true;
  }
}

// Export singleton instance
export const clientRoleManager = ClientRoleManager.getInstance();

// Helper function to check permissions in React components
export async function checkUserPermission(userId: string, permission: Permission, teamId?: string): Promise<boolean> {
  return clientRoleManager.hasPermission(userId, permission, teamId);
}

// Helper function to get user role in React components
export async function getUserRole(userId: string, teamId?: string): Promise<Role | null> {
  return clientRoleManager.getUserHighestRole(userId, teamId);
}