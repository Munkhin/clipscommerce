import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Enroll in 2FA
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
    });

    if (error) {
      logger.error('2FA enrollment error:', error);
      return NextResponse.json(
        { error: `Failed to enroll in 2FA: ${error.message}` },
        { status: 400 }
      );
    }

    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(Math.random().toString(36).substr(2, 8).toUpperCase());
    }

    // Store 2FA settings in our custom table
    const { error: saveError } = await supabase
      .from('user_2fa_settings')
      .upsert({
        user_id: user.id,
        totp_enabled: false, // Will be enabled after verification
        totp_secret: data?.totp?.secret,
        backup_codes: backupCodes,
      });

    if (saveError) {
      logger.error('Error saving 2FA settings:', saveError);
      // Continue anyway, this is not critical for enrollment
    }

    logger.info(`2FA enrollment initiated for user ${user.id}`);

    return NextResponse.json({
      success: true,
      data: {
        qr_code: data?.totp?.qr_code,
        secret: data?.totp?.secret,
        factor_id: data?.id,
        backup_codes: backupCodes
      }
    });

  } catch (error) {
    logger.error('Unexpected error during 2FA enrollment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}