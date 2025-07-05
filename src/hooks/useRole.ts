import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { clientRoleManager, Role, Permission } from '@/lib/rbac/clientRoleManager';

export function useRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userRole = await clientRoleManager.getUserHighestRole(user.id);
        const userPermissions = await clientRoleManager.getUserPermissions(user.id);
        
        setRole(userRole);
        setPermissions(userPermissions);
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [user]);

  const hasPermission = async (permission: Permission): Promise<boolean> => {
    if (!user) return false;
    return clientRoleManager.hasPermission(user.id, permission);
  };

  const hasRole = (targetRole: Role): boolean => {
    return role === targetRole;
  };

  const hasAnyRole = (targetRoles: Role[]): boolean => {
    return role ? targetRoles.includes(role) : false;
  };

  return {
    role,
    permissions,
    loading,
    hasPermission,
    hasRole,
    hasAnyRole,
    isAdmin: role === Role.ADMIN,
    isManager: role === Role.MANAGER,
    isMember: role === Role.MEMBER
  };
}
