import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { createClient } from '@/../supabase';

export function useRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from('users')
        .select('role_id')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
      } else {
        const { data: roleData, error: roleError } = await supabase
          .from('roles')
          .select('name')
          .eq('id', data.role_id)
          .single();
        
        if (roleError) {
          console.error('Error fetching role name:', roleError);
        } else {
          setRole(roleData.name);
        }
      }
    }

    fetchRole();
  }, [user]);

  return role;
}
