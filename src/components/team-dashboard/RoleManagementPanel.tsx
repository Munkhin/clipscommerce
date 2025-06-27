'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Shield, 
  UserPlus, 
  UserMinus, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { Role, Permission, roleManager } from '@/lib/rbac/roleManager';
import { auditLogger } from '@/lib/audit/auditLogger';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: Role;
  assignedAt: Date;
  assignedBy: string;
  expiresAt?: Date;
  isActive: boolean;
  lastActivity?: Date;
}

interface RoleManagementPanelProps {
  teamId: string;
  currentUserId: string;
  currentUserRole: Role;
}

export default function RoleManagementPanel({ 
  teamId, 
  currentUserId, 
  currentUserRole 
}: RoleManagementPanelProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isAssignRoleDialogOpen, setIsAssignRoleDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<Role>(Role.MEMBER);
  const [inviteMessage, setInviteMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load team members
  useEffect(() => {
    loadTeamMembers();
  }, [teamId]);

  // Filter members based on search and role filter
  useEffect(() => {
    let filtered = members;

    if (searchTerm) {
      filtered = filtered.filter(member => 
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(member => member.role === roleFilter);
    }

    setFilteredMembers(filtered);
  }, [members, searchTerm, roleFilter]);

  const loadTeamMembers = async () => {
    try {
      setIsLoading(true);
      // In production, this would fetch from API
      // For now, simulate with mock data
      const mockMembers: TeamMember[] = [
        {
          id: '1',
          email: 'admin@example.com',
          name: 'John Admin',
          role: Role.ADMIN,
          assignedAt: new Date('2024-01-01'),
          assignedBy: 'system',
          isActive: true,
          lastActivity: new Date()
        },
        {
          id: '2',
          email: 'manager@example.com',
          name: 'Jane Manager',
          role: Role.MANAGER,
          assignedAt: new Date('2024-01-15'),
          assignedBy: '1',
          isActive: true,
          lastActivity: new Date()
        },
        {
          id: '3',
          email: 'member@example.com',
          name: 'Bob Member',
          role: Role.MEMBER,
          assignedAt: new Date('2024-02-01'),
          assignedBy: '2',
          isActive: true,
          lastActivity: new Date(Date.now() - 86400000) // 1 day ago
        }
      ];

      setMembers(mockMembers);
    } catch (error) {
      setError('Failed to load team members');
      console.error('Error loading team members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: Role) => {
    try {
      // Check if current user can assign this role
      if (!roleManager.canAssignRole(currentUserId, newRole, teamId)) {
        setError('You do not have permission to assign this role');
        return;
      }

      // Update role
      await roleManager.assignRole(memberId, newRole, currentUserId, teamId);

      // Log the action
      await auditLogger.logAdmin(
        currentUserId,
        'role_assigned',
        'user_role',
        memberId,
        {
          newRole,
          teamId,
          targetUserId: memberId
        }
      );

      // Update local state
      setMembers(prev => prev.map(member => 
        member.id === memberId 
          ? { ...member, role: newRole, assignedBy: currentUserId, assignedAt: new Date() }
          : member
      ));

      setSuccess(`Role updated successfully`);
      setSelectedMember(null);
    } catch (error) {
      setError('Failed to update role');
      console.error('Error updating role:', error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const member = members.find(m => m.id === memberId);
      if (!member) return;

      // Check if current user can manage this member
      if (!roleManager.canManageUser(currentUserId, memberId, teamId)) {
        setError('You do not have permission to remove this member');
        return;
      }

      // Remove all roles for this team
      await roleManager.removeRole(memberId, member.role, teamId);

      // Log the action
      await auditLogger.logAdmin(
        currentUserId,
        'member_removed',
        'team_member',
        memberId,
        {
          removedRole: member.role,
          teamId,
          targetUserId: memberId
        }
      );

      // Update local state
      setMembers(prev => prev.filter(member => member.id !== memberId));
      setSuccess('Member removed successfully');
    } catch (error) {
      setError('Failed to remove member');
      console.error('Error removing member:', error);
    }
  };

  const handleInviteMember = async () => {
    try {
      if (!newMemberEmail || !newMemberRole) {
        setError('Please fill in all required fields');
        return;
      }

      // Check if current user can assign this role
      if (!roleManager.canAssignRole(currentUserId, newMemberRole, teamId)) {
        setError('You do not have permission to assign this role');
        return;
      }

      // In production, this would send an invitation email
      // For now, simulate the invitation
      const newMemberId = `member_${Date.now()}`;
      
      // Log the invitation
      await auditLogger.logAdmin(
        currentUserId,
        'member_invited',
        'team_invitation',
        newMemberId,
        {
          email: newMemberEmail,
          role: newMemberRole,
          teamId,
          message: inviteMessage
        }
      );

      setSuccess(`Invitation sent to ${newMemberEmail}`);
      setIsInviteDialogOpen(false);
      setNewMemberEmail('');
      setNewMemberRole(Role.MEMBER);
      setInviteMessage('');
    } catch (error) {
      setError('Failed to send invitation');
      console.error('Error sending invitation:', error);
    }
  };

  const getRoleBadgeColor = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return 'bg-red-100 text-red-800 border-red-200';
      case Role.MANAGER:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case Role.MEMBER:
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canManageMember = (member: TeamMember) => {
    return roleManager.canManageUser(currentUserId, member.id, teamId);
  };

  const canInviteMembers = () => {
    return roleManager.hasPermission(currentUserId, Permission.USER_INVITE, teamId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading team members...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Role Management
          </h2>
          <p className="text-gray-600 mt-1">
            Manage team member roles and permissions
          </p>
        </div>
        
        {canInviteMembers() && (
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2" data-testid={canInviteMembers() ? 'invite-member' : undefined}>
                <UserPlus className="h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your team with the specified role.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="member@example.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={newMemberRole} onValueChange={(value) => setNewMemberRole(value as Role)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={Role.MEMBER}>Member</SelectItem>
                      {(currentUserRole === Role.ADMIN || currentUserRole === Role.MANAGER) && (
                        <SelectItem value={Role.MANAGER}>Manager</SelectItem>
                      )}
                      {currentUserRole === Role.ADMIN && (
                        <SelectItem value={Role.ADMIN}>Administrator</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="message">Invitation Message (Optional)</Label>
                  <Textarea
                    id="message"
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="Welcome to our team! We're excited to have you join us."
                    rows={3}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInviteMember}>
                  Send Invitation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="sm:w-48">
              <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as Role | 'all')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value={Role.ADMIN}>Administrators</SelectItem>
                  <SelectItem value={Role.MANAGER}>Managers</SelectItem>
                  <SelectItem value={Role.MEMBER}>Members</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members ({filteredMembers.length})
          </CardTitle>
          <CardDescription>
            Manage roles and permissions for team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(member.role)}>
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{member.assignedAt.toLocaleDateString('en-US')}</div>
                      <div className="text-gray-500">by {member.assignedBy}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {member.lastActivity ? (
                      <div className="text-sm">
                        {member.lastActivity.toLocaleDateString('en-US')}
                      </div>
                    ) : (
                      <span className="text-gray-400">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {member.isActive ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {canManageMember(member) && member.id !== currentUserId && (
                      <div className="flex items-center gap-2 justify-end">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedMember(member)}
                              data-testid={canManageMember(member) ? 'change-role' : undefined}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Change Role</DialogTitle>
                              <DialogDescription>
                                Update the role for {member.name}
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div>
                                <Label>Current Role</Label>
                                <div className="mt-1">
                                  <Badge className={getRoleBadgeColor(member.role)}>
                                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                  </Badge>
                                </div>
                              </div>
                              
                              <div>
                                <Label>New Role</Label>
                                <Select 
                                  defaultValue={member.role}
                                  onValueChange={(value) => handleRoleChange(member.id, value as Role)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={Role.MEMBER}>Member</SelectItem>
                                    {(currentUserRole === Role.ADMIN || currentUserRole === Role.MANAGER) && (
                                      <SelectItem value={Role.MANAGER}>Manager</SelectItem>
                                    )}
                                    {currentUserRole === Role.ADMIN && (
                                      <SelectItem value={Role.ADMIN}>Administrator</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-600 hover:text-red-700"
                          data-testid={canManageMember(member) ? 'remove-member' : undefined}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredMembers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No team members found</p>
              <p className="text-sm text-gray-500 mt-1">
                {searchTerm || roleFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Invite members to get started'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 