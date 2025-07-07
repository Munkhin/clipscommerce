'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { Shield, Smartphone, Key, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useRole } from '@/hooks/useRole';

interface TwoFactorSettings {
  totpEnabled: boolean;
  backupCodes: string[];
  lastUsedAt?: string;
}

export default function SecuritySettingsPage() {
  const { user } = useAuth();
  const { role, hasPermission } = useRole();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [twoFactorSettings, setTwoFactorSettings] = useState<TwoFactorSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function checkEnrollmentStatus() {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        // Check Supabase MFA status
        const { data: mfaData, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (mfaError) {
          console.error('Error getting authenticator assurance level:', mfaError);
        } else {
          const aal = mfaData?.nextLevel || mfaData?.currentLevel;
          setIsEnrolled(aal === 'aal2');
        }
        
        // Check our custom 2FA settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('user_2fa_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (settingsError && settingsError.code !== 'PGRST116') {
          console.error('Error getting 2FA settings:', settingsError);
        } else if (settingsData) {
          setTwoFactorSettings({
            totpEnabled: settingsData.totp_enabled,
            backupCodes: settingsData.backup_codes || [],
            lastUsedAt: settingsData.last_used_at
          });
        }
      } catch (err) {
        console.error('Error checking enrollment status:', err);
        setError('Failed to load security settings');
      } finally {
        setLoading(false);
      }
    }
    
    checkEnrollmentStatus();
  }, [user, supabase.auth.mfa]);

  const generateBackupCodes = (): string[] => {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substr(2, 8).toUpperCase());
    }
    return codes;
  };

  const handleEnroll = async () => {
    setError(null);
    setSuccess(null);
    
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });
      
      if (error) {
        setError(`Error enrolling in 2FA: ${error.message}`);
        return;
      }
      
      setQrCode(data!.totp.qr_code);
      setChallengeId(data!.id);
      
      // Generate backup codes
      const newBackupCodes = generateBackupCodes();
      setBackupCodes(newBackupCodes);
    } catch (err) {
      setError('Failed to start 2FA enrollment');
    }
  };

  const handleVerify = async () => {
    if (!challengeId) return;
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          factorId: challengeId,
          code: verificationCode,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to verify 2FA code');
        return;
      }
      
      setIsEnrolled(true);
      setQrCode(null);
      setVerificationCode('');
      setShowBackupCodes(true);
      setSuccess('2FA has been successfully enabled! Please save your backup codes.');
      
      setTwoFactorSettings({
        totpEnabled: true,
        backupCodes,
        lastUsedAt: new Date().toISOString()
      });
    } catch (err) {
      setError('Failed to verify 2FA code');
    }
  };

  const handleUnenroll = async () => {
    setError(null);
    setSuccess(null);
    
    try {
      // Get all factors first
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) {
        setError(`Error getting factors: ${factorsError.message}`);
        return;
      }
      
      // Unenroll all TOTP factors
      for (const factor of factors.totp || []) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (error) {
          setError(`Error unenrolling from 2FA: ${error.message}`);
          return;
        }
      }
      
      // Update our custom settings
      await supabase
        .from('user_2fa_settings')
        .update({
          totp_enabled: false,
          backup_codes: []
        })
        .eq('user_id', user!.id);
      
      // Update profile
      await supabase
        .from('profiles')
        .update({ 
          two_factor_enabled: false,
          two_factor_backup_codes: []
        })
        .eq('id', user!.id);
      
      setIsEnrolled(false);
      setTwoFactorSettings(null);
      setBackupCodes([]);
      setShowBackupCodes(false);
      setSuccess('2FA has been disabled successfully.');
    } catch (err) {
      setError('Failed to disable 2FA');
    }
  };

  const copyBackupCodes = () => {
    const codesText = (twoFactorSettings?.backupCodes || backupCodes).join('\n');
    navigator.clipboard.writeText(codesText);
    setSuccess('Backup codes copied to clipboard!');
  };

  const regenerateBackupCodes = async () => {
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/auth/2fa/backup-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to generate new backup codes');
        return;
      }
      
      setTwoFactorSettings(prev => prev ? {
        ...prev,
        backupCodes: data.backupCodes
      } : null);
      
      setSuccess('New backup codes generated successfully! Please save them securely.');
      setShowBackupCodes(true);
    } catch (err) {
      setError('Failed to generate new backup codes');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Security Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account security and authentication methods.</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
            {isEnrolled && <Badge variant="secondary">Enabled</Badge>}
          </div>
          <p className="text-sm text-gray-600">
            Add an extra layer of security to your account with two-factor authentication.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEnrolled ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">2FA is enabled on your account</span>
              </div>
              
              {twoFactorSettings?.lastUsedAt && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">
                    Last used: {new Date(twoFactorSettings.lastUsedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              
              <Separator />
              
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowBackupCodes(!showBackupCodes)}
                  className="w-full sm:w-auto"
                >
                  <Key className="h-4 w-4 mr-2" />
                  {showBackupCodes ? 'Hide' : 'Show'} Backup Codes
                </Button>
                
                <Button 
                  variant="destructive" 
                  onClick={handleUnenroll}
                  className="w-full sm:w-auto"
                >
                  Disable 2FA
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Smartphone className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">
                    2FA is not enabled on your account. Enable it now to secure your account with an authenticator app like Google Authenticator, Authy, or 1Password.
                  </p>
                </div>
              </div>
              
              <Button onClick={handleEnroll} className="w-full sm:w-auto">
                <Shield className="h-4 w-4 mr-2" />
                Enable 2FA
              </Button>
              
              {qrCode && (
                <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                  <div>
                    <h4 className="font-medium mb-2">Step 1: Scan QR Code</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Scan this QR code with your authenticator app:
                    </p>
                    <div className="bg-white p-4 rounded border inline-block">
                      <div dangerouslySetInnerHTML={{ __html: qrCode }} />
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Step 2: Enter Verification Code</h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="verification-code">6-digit code from your app</Label>
                        <Input
                          id="verification-code"
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          className="w-32"
                          maxLength={6}
                        />
                      </div>
                      <Button 
                        onClick={handleVerify} 
                        disabled={verificationCode.length !== 6}
                        className="w-full sm:w-auto"
                      >
                        Verify and Enable 2FA
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup Codes */}
      {(showBackupCodes || (backupCodes.length > 0 && !isEnrolled)) && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <CardTitle>Backup Codes</CardTitle>
            </div>
            <p className="text-sm text-gray-600">
              Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded border font-mono text-sm">
                {(twoFactorSettings?.backupCodes || backupCodes).map((code, index) => (
                  <div key={index} className="p-2 bg-white border rounded text-center">
                    {code}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={copyBackupCodes}>
                  Copy All Codes
                </Button>
                <Button variant="outline" onClick={regenerateBackupCodes}>
                  Generate New Codes
                </Button>
                <Button variant="outline" onClick={() => setShowBackupCodes(false)}>
                  Hide Codes
                </Button>
              </div>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Each backup code can only be used once. Store them securely and don't share them with anyone.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Email:</span>
              <span className="text-sm font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Role:</span>
              <span className="text-sm font-medium capitalize">{role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Account Created:</span>
              <span className="text-sm font-medium">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
