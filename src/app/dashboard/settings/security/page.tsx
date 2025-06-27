'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/providers/AuthProvider';

export default function SecuritySettingsPage() {
  const { user } = useAuth();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');

  const supabase = createClientComponentClient();

  useEffect(() => {
    async function checkEnrollmentStatus() {
      if (!user) return;
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) {
        console.error('Error getting authenticator assurance level:', error);
        return;
      }
      const aal = data?.nextLevel || data?.currentLevel;
      setIsEnrolled(aal === 'aal2');
    }
    checkEnrollmentStatus();
  }, [user, supabase.auth.mfa]);

  const handleEnroll = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
    });
    if (error) {
      alert(`Error enrolling in 2FA: ${error.message}`);
      return;
    }
    setQrCode(data!.totp.qr_code);
    setChallengeId(data!.id);
  };

  const handleVerify = async () => {
    if (!challengeId) return;
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      challengeId,
      factorId: challengeId,
      code: verificationCode,
    });
    if (error) {
      alert(`Error verifying 2FA: ${error.message}`);
    } else {
      setIsEnrolled(true);
      setQrCode(null);
    }
  };

  const handleUnenroll = async () => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: 'aal2' });
    if (error) {
      alert(`Error unenrolling from 2FA: ${error.message}`);
    } else {
      setIsEnrolled(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
      </CardHeader>
      <CardContent>
        {isEnrolled ? (
          <div>
            <p>2FA is enabled on your account.</p>
            <Button onClick={handleUnenroll} className="mt-4">
              Disable 2FA
            </Button>
          </div>
        ) : (
          <div>
            <p>2FA is not enabled on your account.</p>
            <Button onClick={handleEnroll} className="mt-4">
              Enable 2FA
            </Button>
            {qrCode && (
              <div className="mt-4">
                <p>Scan this QR code with your authenticator app:</p>
                <div dangerouslySetInnerHTML={{ __html: qrCode }} />
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Verification code"
                  className="mt-2 p-2 border rounded"
                />
                <Button onClick={handleVerify} className="mt-2">
                  Verify
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
