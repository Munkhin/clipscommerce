'use client';

import React, { useState, useEffect } from 'react';
import { useTeamMode } from '@/providers/TeamModeProvider';
import { useAuth } from '@/providers/AuthProvider';
import TeamSidebar from '@/components/team-dashboard/TeamSidebar';
import TeamHeader from '@/components/team-dashboard/TeamHeader';
import RoleManagementPanel from '@/components/team-dashboard/RoleManagementPanel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Settings, 
  Users, 
  Shield, 
  Bell, 
  Globe, 
  Database,
  Key,
  Mail,
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Trash2,
  Plus,
  Edit,
  UserPlus,
  Crown,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { Role } from '@/lib/rbac/roleManager';

// Mock team settings data
interface TeamSettings {
  general: {
    teamName: string;
    description: string;
    timezone: string;
    language: string;
    currency: string;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    weeklyReports: boolean;
    systemAlerts: boolean;
    clientUpdates: boolean;
  };
  security: {
    twoFactorAuth: boolean;
    sessionTimeout: number;
    ipWhitelist: string[];
    apiAccess: boolean;
  };
  integrations: {
    platforms: {
      name: string;
      enabled: boolean;
      status: 'connected' | 'disconnected' | 'error';
    }[];
  };
  billing: {
    plan: string;
    seats: number;
    billingEmail: string;
    nextBilling: Date;
  };
}

const mockTeamSettings: TeamSettings = {
  general: {
    teamName: 'ClipsCommerce Team',
    description: 'Professional influencer management and content automation platform',
    timezone: 'UTC-8 (Pacific Time)',
    language: 'English',
    currency: 'USD'
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    weeklyReports: true,
    systemAlerts: true,
    clientUpdates: false
  },
  security: {
    twoFactorAuth: true,
    sessionTimeout: 30,
    ipWhitelist: ['192.168.1.0/24', '10.0.0.0/8'],
    apiAccess: true
  },
  integrations: {
    platforms: [
      { name: 'TikTok', enabled: true, status: 'connected' },
      { name: 'Instagram', enabled: true, status: 'connected' },
      { name: 'YouTube', enabled: false, status: 'disconnected' },
      { name: 'Twitter', enabled: true, status: 'error' }
    ]
  },
  billing: {
    plan: 'Professional',
    seats: 5,
    billingEmail: 'billing@clipscommerce.com',
    nextBilling: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15)
  }
};

export default function TeamSettingsPage() {
  const { user } = useAuth();
  const { setCurrentTab, totalClientCount } = useTeamMode();
  const [settings, setSettings] = useState<TeamSettings>(mockTeamSettings);
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    setCurrentTab('settings');
  }, [setCurrentTab]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In a real app, this would save to the backend
    } finally {
      setIsSaving(false);
    }
  };

  const updateGeneralSettings = (field: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      general: {
        ...prev.general,
        [field]: value
      }
    }));
  };

  const updateNotificationSettings = (field: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: value
      }
    }));
  };

  const updateSecuritySettings = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      security: {
        ...prev.security,
        [field]: value
      }
    }));
  };

  const togglePlatform = (platformName: string) => {
    setSettings(prev => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        platforms: prev.integrations.platforms.map(platform =>
          platform.name === platformName
            ? { ...platform, enabled: !platform.enabled }
            : platform
        )
      }
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800 border-green-200';
      case 'disconnected': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4" />;
      case 'disconnected': return <AlertTriangle className="h-4 w-4" />;
      case 'error': return <AlertTriangle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'team', label: 'Team & Roles', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'integrations', label: 'Integrations', icon: Globe },
    { id: 'billing', label: 'Billing', icon: Database }
  ];

  return (
    <div className="flex h-screen bg-background">
      <TeamSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TeamHeader />
        
        <main className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-creative">Team Settings</h1>
                <p className="text-muted-foreground">
                  Manage your team configuration and preferences
                </p>
              </div>
              
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Settings Navigation */}
              <div className="lg:w-64">
                <Card>
                  <CardContent className="p-4">
                    <nav className="space-y-1">
                      {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                              activeTab === tab.id
                                ? 'bg-mint/10 text-mint border border-mint/20'
                                : 'hover:bg-muted text-muted-foreground'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="text-sm font-medium">{tab.label}</span>
                          </button>
                        );
                      })}
                    </nav>
                  </CardContent>
                </Card>
              </div>

              {/* Settings Content */}
              <div className="flex-1">
                {activeTab === 'general' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>General Settings</CardTitle>
                      <CardDescription>Basic team information and preferences</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="teamName">Team Name</Label>
                          <Input
                            id="teamName"
                            value={settings.general.teamName}
                            onChange={(e) => updateGeneralSettings('teamName', e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="timezone">Timezone</Label>
                          <select
                            id="timezone"
                            value={settings.general.timezone}
                            onChange={(e) => updateGeneralSettings('timezone', e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                          >
                            <option value="UTC-8 (Pacific Time)">UTC-8 (Pacific Time)</option>
                            <option value="UTC-5 (Eastern Time)">UTC-5 (Eastern Time)</option>
                            <option value="UTC+0 (GMT)">UTC+0 (GMT)</option>
                            <option value="UTC+1 (CET)">UTC+1 (CET)</option>
                          </select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="language">Language</Label>
                          <select
                            id="language"
                            value={settings.general.language}
                            onChange={(e) => updateGeneralSettings('language', e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                          >
                            <option value="English">English</option>
                            <option value="Spanish">Spanish</option>
                            <option value="French">French</option>
                            <option value="German">German</option>
                          </select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="currency">Currency</Label>
                          <select
                            id="currency"
                            value={settings.general.currency}
                            onChange={(e) => updateGeneralSettings('currency', e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                          >
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="CAD">CAD (C$)</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="description">Team Description</Label>
                        <Textarea
                          id="description"
                          value={settings.general.description}
                          onChange={(e) => updateGeneralSettings('description', e.target.value)}
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'team' && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Team Members</CardTitle>
                            <CardDescription>Manage team members and their roles</CardDescription>
                          </div>
                          <Button>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Invite Member
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-mint/10 rounded-full flex items-center justify-center">
                                <Crown className="h-5 w-5 text-mint" />
                              </div>
                              <div>
                                <h4 className="font-semibold">John Doe</h4>
                                <p className="text-sm text-muted-foreground">john@clipscommerce.com</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className="bg-mint/10 text-mint border-mint/20">Owner</Badge>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-info/10 rounded-full flex items-center justify-center">
                                <Users className="h-5 w-5 text-info" />
                              </div>
                              <div>
                                <h4 className="font-semibold">Sarah Wilson</h4>
                                <p className="text-sm text-muted-foreground">sarah@clipscommerce.com</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">Admin</Badge>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <RoleManagementPanel 
                      teamId="team-1"
                      currentUserId="user-1"
                      currentUserRole={Role.ADMIN}
                    />
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Notification Preferences</CardTitle>
                      <CardDescription>Configure how you receive notifications</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Email Notifications</Label>
                            <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                          </div>
                          <Switch
                            checked={settings.notifications.emailNotifications}
                            onCheckedChange={(checked) => updateNotificationSettings('emailNotifications', checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Push Notifications</Label>
                            <p className="text-sm text-muted-foreground">Receive push notifications in browser</p>
                          </div>
                          <Switch
                            checked={settings.notifications.pushNotifications}
                            onCheckedChange={(checked) => updateNotificationSettings('pushNotifications', checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Weekly Reports</Label>
                            <p className="text-sm text-muted-foreground">Receive weekly performance summaries</p>
                          </div>
                          <Switch
                            checked={settings.notifications.weeklyReports}
                            onCheckedChange={(checked) => updateNotificationSettings('weeklyReports', checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>System Alerts</Label>
                            <p className="text-sm text-muted-foreground">Important system notifications</p>
                          </div>
                          <Switch
                            checked={settings.notifications.systemAlerts}
                            onCheckedChange={(checked) => updateNotificationSettings('systemAlerts', checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Client Updates</Label>
                            <p className="text-sm text-muted-foreground">Notifications about client activities</p>
                          </div>
                          <Switch
                            checked={settings.notifications.clientUpdates}
                            onCheckedChange={(checked) => updateNotificationSettings('clientUpdates', checked)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'security' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Security Settings</CardTitle>
                      <CardDescription>Manage security and access controls</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Two-Factor Authentication</Label>
                            <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                          </div>
                          <Switch
                            checked={settings.security.twoFactorAuth}
                            onCheckedChange={(checked) => updateSecuritySettings('twoFactorAuth', checked)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                          <Input
                            id="sessionTimeout"
                            type="number"
                            value={settings.security.sessionTimeout}
                            onChange={(e) => updateSecuritySettings('sessionTimeout', parseInt(e.target.value))}
                            className="w-32"
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>API Access</Label>
                            <p className="text-sm text-muted-foreground">Allow API access for integrations</p>
                          </div>
                          <Switch
                            checked={settings.security.apiAccess}
                            onCheckedChange={(checked) => updateSecuritySettings('apiAccess', checked)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>API Key</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              type={showApiKey ? 'text' : 'password'}
                              value="sk_live_1234567890abcdef"
                              readOnly
                              className="flex-1"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowApiKey(!showApiKey)}
                            >
                              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button variant="outline" size="sm">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'integrations' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Platform Integrations</CardTitle>
                      <CardDescription>Manage connected social media platforms</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {settings.integrations.platforms.map((platform) => (
                          <div key={platform.name} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                                <Globe className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="font-semibold">{platform.name}</h4>
                                <div className="flex items-center space-x-2">
                                  <Badge className={getStatusColor(platform.status)}>
                                    <div className="flex items-center space-x-1">
                                      {getStatusIcon(platform.status)}
                                      <span className="capitalize">{platform.status}</span>
                                    </div>
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={platform.enabled}
                                onCheckedChange={() => togglePlatform(platform.name)}
                              />
                              <Button variant="outline" size="sm">
                                Configure
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'billing' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Billing & Subscription</CardTitle>
                      <CardDescription>Manage your subscription and billing information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <Label>Current Plan</Label>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge className="bg-mint/10 text-mint border-mint/20">
                                {settings.billing.plan}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {settings.billing.seats} seats
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <Label>Next Billing Date</Label>
                            <p className="text-sm mt-1">
                              {settings.billing.nextBilling.toLocaleDateString('en-US')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="billingEmail">Billing Email</Label>
                            <Input
                              id="billingEmail"
                              type="email"
                              value={settings.billing.billingEmail}
                              onChange={(e) => setSettings(prev => ({
                                ...prev,
                                billing: {
                                  ...prev.billing,
                                  billingEmail: e.target.value
                                }
                              }))}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button variant="outline">
                          View Invoices
                        </Button>
                        <Button variant="outline">
                          Update Payment Method
                        </Button>
                        <Button variant="outline">
                          Upgrade Plan
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 