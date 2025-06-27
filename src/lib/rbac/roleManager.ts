/**
 * Role-Based Access Control (RBAC) System
 * Defines roles, permissions, and access control logic
 */

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
  name: Role;
  displayName: string;
  description: string;
  permissions: Permission[];
  inherits?: Role[];
}

export interface UserRole {
  userId: string;
  role: Role;
  teamId?: string;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export class RoleManager {
  private static instance: RoleManager;
  private roleDefinitions: Map<Role, RoleDefinition> = new Map();
  private userRoles: Map<string, UserRole[]> = new Map();

  constructor() {
    this.initializeRoles();
  }

  static getInstance(): RoleManager {
    if (!RoleManager.instance) {
      RoleManager.instance = new RoleManager();
    }
    return RoleManager.instance;
  }

  /**
   * Initialize default role definitions
   */
  private initializeRoles(): void {
    // Member role - basic access
    this.roleDefinitions.set(Role.MEMBER, {
      name: Role.MEMBER,
      displayName: 'Member',
      description: 'Basic team member with limited access',
      permissions: [
        Permission.USER_READ,
        Permission.TEAM_READ,
        Permission.CLIENT_READ,
        Permission.CLIENT_CREATE,
        Permission.CLIENT_UPDATE,
        Permission.ANALYTICS_READ,
        Permission.API_READ
      ]
    });

    // Manager role - extended access
    this.roleDefinitions.set(Role.MANAGER, {
      name: Role.MANAGER,
      displayName: 'Manager',
      description: 'Team manager with extended permissions',
      permissions: [
        Permission.USER_READ,
        Permission.USER_INVITE,
        Permission.TEAM_READ,
        Permission.TEAM_UPDATE,
        Permission.TEAM_MANAGE_MEMBERS,
        Permission.BILLING_READ,
        Permission.CLIENT_CREATE,
        Permission.CLIENT_READ,
        Permission.CLIENT_UPDATE,
        Permission.CLIENT_DELETE,
        Permission.CLIENT_EXPORT,
        Permission.CLIENT_BULK_OPERATIONS,
        Permission.ANALYTICS_READ,
        Permission.ANALYTICS_EXPORT,
        Permission.API_READ,
        Permission.API_WRITE
      ],
      inherits: [Role.MEMBER]
    });

    // Admin role - full access
    this.roleDefinitions.set(Role.ADMIN, {
      name: Role.ADMIN,
      displayName: 'Administrator',
      description: 'Full administrative access',
      permissions: [
        Permission.USER_CREATE,
        Permission.USER_READ,
        Permission.USER_UPDATE,
        Permission.USER_DELETE,
        Permission.USER_INVITE,
        Permission.TEAM_CREATE,
        Permission.TEAM_READ,
        Permission.TEAM_UPDATE,
        Permission.TEAM_DELETE,
        Permission.TEAM_MANAGE_MEMBERS,
        Permission.BILLING_READ,
        Permission.BILLING_UPDATE,
        Permission.BILLING_CANCEL,
        Permission.BILLING_EXPORT,
        Permission.CLIENT_CREATE,
        Permission.CLIENT_READ,
        Permission.CLIENT_UPDATE,
        Permission.CLIENT_DELETE,
        Permission.CLIENT_EXPORT,
        Permission.CLIENT_BULK_OPERATIONS,
        Permission.ANALYTICS_READ,
        Permission.ANALYTICS_EXPORT,
        Permission.ANALYTICS_ADVANCED,
        Permission.SYSTEM_SETTINGS,
        Permission.SYSTEM_AUDIT_LOGS,
        Permission.SYSTEM_MONITORING,
        Permission.API_READ,
        Permission.API_WRITE,
        Permission.API_ADMIN
      ],
      inherits: [Role.MANAGER]
    });
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
    const userRole: UserRole = {
      userId,
      role,
      teamId,
      assignedBy,
      assignedAt: new Date(),
      expiresAt,
      isActive: true
    };

    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, []);
    }

    // Remove existing role for the same team (if applicable)
    const existingRoles = this.userRoles.get(userId)!;
    const filteredRoles = existingRoles.filter(r => r.teamId !== teamId);
    filteredRoles.push(userRole);
    
    this.userRoles.set(userId, filteredRoles);

    // In production, this would be saved to database
    console.log(`[RBAC] Assigned role ${role} to user ${userId} by ${assignedBy}`);
  }

  /**
   * Remove a role from a user
   */
  async removeRole(userId: string, role: Role, teamId?: string): Promise<void> {
    const userRoles = this.userRoles.get(userId);
    if (!userRoles) return;

    const filteredRoles = userRoles.filter(r => 
      !(r.role === role && r.teamId === teamId)
    );

    this.userRoles.set(userId, filteredRoles);

    console.log(`[RBAC] Removed role ${role} from user ${userId}`);
  }

  /**
   * Get user's roles
   */
  getUserRoles(userId: string, teamId?: string): UserRole[] {
    const userRoles = this.userRoles.get(userId) || [];
    
    return userRoles.filter(role => {
      // Check if role is active and not expired
      if (!role.isActive) return false;
      if (role.expiresAt && role.expiresAt < new Date()) return false;
      
      // Filter by team if specified
      if (teamId !== undefined && role.teamId !== teamId) return false;
      
      return true;
    });
  }

  /**
   * Get user's highest role
   */
  getUserHighestRole(userId: string, teamId?: string): Role | null {
    const roles = this.getUserRoles(userId, teamId);
    if (roles.length === 0) return null;

    // Role hierarchy: Admin > Manager > Member
    const roleHierarchy = [Role.ADMIN, Role.MANAGER, Role.MEMBER];
    
    for (const hierarchyRole of roleHierarchy) {
      if (roles.some(r => r.role === hierarchyRole)) {
        return hierarchyRole;
      }
    }

    return null;
  }

  /**
   * Check if user has permission
   */
  hasPermission(userId: string, permission: Permission, teamId?: string): boolean {
    const roles = this.getUserRoles(userId, teamId);
    
    for (const userRole of roles) {
      const roleDefinition = this.roleDefinitions.get(userRole.role);
      if (!roleDefinition) continue;

      // Check direct permissions
      if (roleDefinition.permissions.includes(permission)) {
        return true;
      }

      // Check inherited permissions
      if (roleDefinition.inherits) {
        for (const inheritedRole of roleDefinition.inherits) {
          const inheritedRoleDefinition = this.roleDefinitions.get(inheritedRole);
          if (inheritedRoleDefinition?.permissions.includes(permission)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(userId: string, permissions: Permission[], teamId?: string): boolean {
    return permissions.some(permission => this.hasPermission(userId, permission, teamId));
  }

  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions(userId: string, permissions: Permission[], teamId?: string): boolean {
    return permissions.every(permission => this.hasPermission(userId, permission, teamId));
  }

  /**
   * Get all permissions for a user
   */
  getUserPermissions(userId: string, teamId?: string): Permission[] {
    const roles = this.getUserRoles(userId, teamId);
    const permissions = new Set<Permission>();

    for (const userRole of roles) {
      const roleDefinition = this.roleDefinitions.get(userRole.role);
      if (!roleDefinition) continue;

      // Add direct permissions
      roleDefinition.permissions.forEach(permission => permissions.add(permission));

      // Add inherited permissions
      if (roleDefinition.inherits) {
        for (const inheritedRole of roleDefinition.inherits) {
          const inheritedRoleDefinition = this.roleDefinitions.get(inheritedRole);
          if (inheritedRoleDefinition) {
            inheritedRoleDefinition.permissions.forEach(permission => permissions.add(permission));
          }
        }
      }
    }

    return Array.from(permissions);
  }

  /**
   * Get role definition
   */
  getRoleDefinition(role: Role): RoleDefinition | undefined {
    return this.roleDefinitions.get(role);
  }

  /**
   * Get all role definitions
   */
  getAllRoleDefinitions(): RoleDefinition[] {
    return Array.from(this.roleDefinitions.values());
  }

  /**
   * Check if user can manage another user
   */
  canManageUser(managerId: string, targetUserId: string, teamId?: string): boolean {
    const managerRole = this.getUserHighestRole(managerId, teamId);
    const targetRole = this.getUserHighestRole(targetUserId, teamId);

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
  canAssignRole(assignerId: string, targetRole: Role, teamId?: string): boolean {
    const assignerRole = this.getUserHighestRole(assignerId, teamId);
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
  getUsersByRole(role: Role, teamId?: string): string[] {
    const users: string[] = [];

    for (const [userId, userRoles] of this.userRoles.entries()) {
      const hasRole = userRoles.some(r => 
        r.role === role && 
        r.isActive && 
        (!r.expiresAt || r.expiresAt > new Date()) &&
        (teamId === undefined || r.teamId === teamId)
      );

      if (hasRole) {
        users.push(userId);
      }
    }

    return users;
  }

  /**
   * Cleanup expired roles
   */
  async cleanupExpiredRoles(): Promise<void> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [userId, userRoles] of this.userRoles.entries()) {
      const activeRoles = userRoles.filter(role => {
        const isExpired = role.expiresAt && role.expiresAt < now;
        if (isExpired) cleanedCount++;
        return !isExpired;
      });

      this.userRoles.set(userId, activeRoles);
    }

    console.log(`[RBAC] Cleaned up ${cleanedCount} expired roles`);
  }
}

// Export singleton instance
export const roleManager = RoleManager.getInstance();

// Middleware for permission checking
export function requirePermission(permission: Permission) {
  return (req: any, res: any, next: any) => {
    const userId = req.user?.id;
    const teamId = req.params?.teamId || req.body?.teamId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roleManager.hasPermission(userId, permission, teamId)) {
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
  return (req: any, res: any, next: any) => {
    const userId = req.user?.id;
    const teamId = req.params?.teamId || req.body?.teamId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRoles = roleManager.getUserRoles(userId, teamId);
    const hasRole = userRoles.some(r => r.role === role);

    if (!hasRole) {
      return res.status(403).json({ 
        error: 'Insufficient role',
        required: role
      });
    }

    next();
  };
} 