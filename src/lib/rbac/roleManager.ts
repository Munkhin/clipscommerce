/**
 * Role-Based Access Control (RBAC) System
 * Defines roles, permissions, and access control logic
 * Now integrated with Supabase database
 */

import { createClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import logger from '@/utils/logger';

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

export interface RoleDefinition {
  id: string;
  name: Role;
  displayName: string;
  description: string;
  permissions: Permission[];
  inheritsFrom?: string[];
  createdAt: Date;
  updatedAt: Date;
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

export interface TeamInfo {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class RoleManager {
  private static instance: RoleManager;
  private isServer: boolean;

  constructor(isServer: boolean = false) {
    this.isServer = isServer;
  }

  static getInstance(isServer: boolean = false): RoleManager {
    if (!RoleManager.instance) {
      RoleManager.instance = new RoleManager(isServer);
    }
    return RoleManager.instance;
  }

  /**
   * Get Supabase client based on environment
   */
  private getSupabaseClient() {
    if (this.isServer) {
      return createServerClient(cookies());
    }
    return createClient();
  }

  /**
   * Assign a role to a user
   */
  async assignRole(
    userId: string,
    role: Role,
    assignedBy: string,
    teamId?: string,
    expiresAt?: Date
  ): Promise<void> {
    const supabase = this.getSupabaseClient();
    
    try {
      // First, get the role ID
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', role)
        .single();
      
      if (roleError || !roleData) {
        throw new Error(`Role ${role} not found`);
      }
      
      // Insert or update user role
      const { error: assignError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role_id: roleData.id,
          team_id: teamId,
          assigned_by: assignedBy,
          expires_at: expiresAt?.toISOString(),
          is_active: true
        }, {
          onConflict: 'user_id,role_id,team_id'
        });
      
      if (assignError) {
        throw assignError;
      }
      
      logger.info(`[RBAC] Assigned role ${role} to user ${userId} by ${assignedBy}`);
    } catch (error) {
      logger.error(`[RBAC] Error assigning role ${role} to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Remove a role from a user
   */
  async removeRole(userId: string, role: Role, teamId?: string): Promise<void> {
    const supabase = this.getSupabaseClient();
    
    try {
      // Get the role ID
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', role)
        .single();
      
      if (roleError || !roleData) {
        throw new Error(`Role ${role} not found`);
      }
      
      // Remove user role
      const { error: removeError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleData.id)
        .eq('team_id', teamId);
      
      if (removeError) {
        throw removeError;
      }
      
      logger.info(`[RBAC] Removed role ${role} from user ${userId}`);
    } catch (error) {
      logger.error(`[RBAC] Error removing role ${role} from user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's roles
   */
  async getUserRoles(userId: string, teamId?: string): Promise<UserRole[]> {
    const supabase = this.getSupabaseClient();
    
    try {
      let query = supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (teamId !== undefined) {
        query = query.eq('team_id', teamId);
      }
      
      const { data, error } = await query;
      
      if (error) {
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
      logger.error(`[RBAC] Error getting user roles for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get user's highest role
   */
  async getUserHighestRole(userId: string, teamId?: string): Promise<Role | null> {
    const supabase = this.getSupabaseClient();
    
    try {
      let query = supabase
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (teamId !== undefined) {
        query = query.eq('team_id', teamId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) return null;
      
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
      
      return null;
    } catch (error) {
      logger.error(`[RBAC] Error getting user highest role for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Check if user has permission
   */
  async hasPermission(userId: string, permission: Permission, teamId?: string): Promise<boolean> {
    const supabase = this.getSupabaseClient();
    
    try {
      const { data, error } = await supabase.rpc('user_has_permission', {
        user_uuid: userId,
        permission_name: permission
      });
      
      if (error) {
        logger.error(`[RBAC] Error checking permission ${permission} for user ${userId}:`, error);
        return false;
      }
      
      return data || false;
    } catch (error) {
      logger.error(`[RBAC] Error checking permission ${permission} for user ${userId}:`, error);
      return false;
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

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string, teamId?: string): Promise<Permission[]> {
    const supabase = this.getSupabaseClient();
    
    try {
      const { data, error } = await supabase.rpc('get_user_permissions', {
        user_uuid: userId
      });
      
      if (error) {
        logger.error(`[RBAC] Error getting permissions for user ${userId}:`, error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      logger.error(`[RBAC] Error getting permissions for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get role definition
   */
  async getRoleDefinition(role: Role): Promise<RoleDefinition | null> {
    const supabase = this.getSupabaseClient();
    
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('name', role)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return {
        id: data.id,
        name: data.name as Role,
        displayName: data.display_name,
        description: data.description,
        permissions: data.permissions || [],
        inheritsFrom: data.inherits_from,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      logger.error(`[RBAC] Error getting role definition for ${role}:`, error);
      return null;
    }
  }

  /**
   * Get all role definitions
   */
  async getAllRoleDefinitions(): Promise<RoleDefinition[]> {
    const supabase = this.getSupabaseClient();
    
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');
      
      if (error) {
        logger.error('[RBAC] Error getting all role definitions:', error);
        return [];
      }
      
      return (data || []).map(role => ({
        id: role.id,
        name: role.name as Role,
        displayName: role.display_name,
        description: role.description,
        permissions: role.permissions || [],
        inheritsFrom: role.inherits_from,
        createdAt: new Date(role.created_at),
        updatedAt: new Date(role.updated_at)
      }));
    } catch (error) {
      logger.error('[RBAC] Error getting all role definitions:', error);
      return [];
    }
  }

  /**
   * Check if user can manage another user
   */
  async canManageUser(managerId: string, targetUserId: string, teamId?: string): Promise<boolean> {
    const managerRole = await this.getUserHighestRole(managerId, teamId);
    const targetRole = await this.getUserHighestRole(targetUserId, teamId);

    if (!managerRole || !targetRole) return false;

    // Role hierarchy for management
    const hierarchy = [Role.ADMIN, Role.MANAGER, Role.MEMBER];
    const managerIndex = hierarchy.indexOf(managerRole);
    const targetIndex = hierarchy.indexOf(targetRole);

    // Can manage users with lower or equal hierarchy level
    return managerIndex <= targetIndex;
  }

  /**
   * Validate role assignment
   */
  async canAssignRole(assignerId: string, targetRole: Role, teamId?: string): Promise<boolean> {
    const assignerRole = await this.getUserHighestRole(assignerId, teamId);
    if (!assignerRole) return false;

    // Only admins can assign admin roles
    if (targetRole === Role.ADMIN) {
      return assignerRole === Role.ADMIN;
    }

    // Admins and managers can assign manager and member roles
    if (targetRole === Role.MANAGER) {
      return assignerRole === Role.ADMIN || assignerRole === Role.MANAGER;
    }

    // All roles can assign member roles
    return true;
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: Role, teamId?: string): Promise<string[]> {
    const supabase = this.getSupabaseClient();
    
    try {
      let query = supabase
        .from('user_roles')
        .select('user_id, roles!inner(name)')
        .eq('is_active', true)
        .eq('roles.name', role);
      
      if (teamId !== undefined) {
        query = query.eq('team_id', teamId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        logger.error(`[RBAC] Error getting users by role ${role}:`, error);
        return [];
      }
      
      // Filter out expired roles
      const activeUsers = (data || []).filter(userRole => {
        if (!userRole.expires_at) return true;
        return new Date(userRole.expires_at) > new Date();
      });
      
      return activeUsers.map(userRole => userRole.user_id);
    } catch (error) {
      logger.error(`[RBAC] Error getting users by role ${role}:`, error);
      return [];
    }
  }

  /**
   * Cleanup expired roles
   */
  async cleanupExpiredRoles(): Promise<void> {
    const supabase = this.getSupabaseClient();
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .update({ is_active: false })
        .lt('expires_at', new Date().toISOString())
        .select('count');
      
      if (error) {
        logger.error('[RBAC] Error cleaning up expired roles:', error);
        return;
      }
      
      const cleanedCount = data?.length || 0;
      logger.info(`[RBAC] Cleaned up ${cleanedCount} expired roles`);
    } catch (error) {
      logger.error('[RBAC] Error cleaning up expired roles:', error);
    }
  }

  /**
   * Create a new team
   */
  async createTeam(name: string, description: string, ownerId: string): Promise<string> {
    const supabase = this.getSupabaseClient();
    
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name,
          description,
          owner_id: ownerId
        })
        .select('id')
        .single();
      
      if (error) {
        throw error;
      }
      
      logger.info(`[RBAC] Created team ${name} with ID ${data.id}`);
      return data.id;
    } catch (error) {
      logger.error(`[RBAC] Error creating team ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get team information
   */
  async getTeam(teamId: string): Promise<TeamInfo | null> {
    const supabase = this.getSupabaseClient();
    
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        ownerId: data.owner_id,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      logger.error(`[RBAC] Error getting team ${teamId}:`, error);
      return null;
    }
  }

  /**
   * Get user's teams
   */
  async getUserTeams(userId: string): Promise<TeamInfo[]> {
    const supabase = this.getSupabaseClient();
    
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .or(`owner_id.eq.${userId},id.in.(${await this.getUserTeamIds(userId)})`);
      
      if (error) {
        logger.error(`[RBAC] Error getting teams for user ${userId}:`, error);
        return [];
      }
      
      return (data || []).map(team => ({
        id: team.id,
        name: team.name,
        description: team.description,
        ownerId: team.owner_id,
        createdAt: new Date(team.created_at),
        updatedAt: new Date(team.updated_at)
      }));
    } catch (error) {
      logger.error(`[RBAC] Error getting teams for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get team IDs for a user
   */
  private async getUserTeamIds(userId: string): Promise<string> {
    const supabase = this.getSupabaseClient();
    
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('team_id')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      return (data || [])
        .map(role => role.team_id)
        .filter(Boolean)
        .join(',');
    } catch (error) {
      return '';
    }
  }
}

// Export singleton instances
export const roleManager = RoleManager.getInstance();
export const serverRoleManager = RoleManager.getInstance(true);

// Middleware for permission checking
export function requirePermission(permission: Permission) {
  return async (req: any, res: any, next: any) => {
    const userId = req.user?.id;
    const teamId = req.params?.teamId || req.body?.teamId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasPermission = await serverRoleManager.hasPermission(userId, permission, teamId);
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permission
      });
    }

    next();
  };
}

// Middleware for role checking
export function requireRole(role: Role) {
  return async (req: any, res: any, next: any) => {
    const userId = req.user?.id;
    const teamId = req.params?.teamId || req.body?.teamId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRoles = await serverRoleManager.getUserRoles(userId, teamId);
    const hasRole = userRoles.some(r => r.roleId === role);

    if (!hasRole) {
      return res.status(403).json({ 
        error: 'Insufficient role',
        required: role
      });
    }

    next();
  };
}

// Helper function to check permissions in React components
export async function checkUserPermission(userId: string, permission: Permission, teamId?: string): Promise<boolean> {
  return roleManager.hasPermission(userId, permission, teamId);
}

// Helper function to get user role in React components
export async function getUserRole(userId: string, teamId?: string): Promise<Role | null> {
  return roleManager.getUserHighestRole(userId, teamId);
} 