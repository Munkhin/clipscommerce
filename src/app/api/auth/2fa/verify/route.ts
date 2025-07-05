import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const { factorId, code, isBackupCode } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient(cookies());
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Handle backup code verification
    if (isBackupCode) {
      const { data: twoFactorSettings, error: settingsError } = await supabase
        .from('user_2fa_settings')
        .select('backup_codes, recovery_codes_used')
        .eq('user_id', user.id)
        .single();

      if (settingsError || !twoFactorSettings) {
        return NextResponse.json(
          { error: 'No 2FA settings found' },
          { status: 404 }
        );
      }

      const backupCodes = twoFactorSettings.backup_codes || [];
      const normalizedCode = code.toUpperCase().replace(/\s+/g, '');
      
      if (!backupCodes.includes(normalizedCode)) {
        logger.warn(`Invalid backup code attempt for user ${user.id}`);
        return NextResponse.json(
          { error: 'Invalid backup code' },
          { status: 400 }
        );
      }

      // Remove the used backup code
      const updatedBackupCodes = backupCodes.filter(c => c !== normalizedCode);
      
      // Update the 2FA settings
      const { error: updateError } = await supabase
        .from('user_2fa_settings')
        .update({
          backup_codes: updatedBackupCodes,
          recovery_codes_used: (twoFactorSettings.recovery_codes_used || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        logger.error('Error updating 2FA settings after backup code use:', updateError);
      }

      logger.info(`Backup code used for user ${user.id}. ${updatedBackupCodes.length} codes remaining.`);

      return NextResponse.json({
        success: true,
        message: 'Backup code verified successfully',
        backupCodesRemaining: updatedBackupCodes.length
      });
    }

    // Handle regular TOTP verification
    if (!factorId) {
      return NextResponse.json(
        { error: 'Factor ID is required for TOTP verification' },
        { status: 400 }
      );
    }

    // Verify the 2FA code
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    if (verifyError) {
      logger.error('2FA verification error:', verifyError);
      return NextResponse.json(
        { error: `Failed to verify 2FA code: ${verifyError.message}` },
        { status: 400 }
      );
    }

    // Update 2FA settings to enabled
    const { error: updateError } = await supabase
      .from('user_2fa_settings')
      .update({
        totp_enabled: true,
        last_used_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      logger.error('Error updating 2FA settings:', updateError);
    }

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        two_factor_enabled: true,
      })
      .eq('id', user.id);

    if (profileError) {
      logger.error('Error updating profile 2FA status:', profileError);
    }

    logger.info(`2FA successfully enabled for user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: '2FA successfully enabled'
    });

  } catch (error) {
    logger.error('Unexpected error during 2FA verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}