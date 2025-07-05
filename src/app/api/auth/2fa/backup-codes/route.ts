import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';

export async function GET(request: NextRequest) {
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

    // Get 2FA settings
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

    return NextResponse.json({
      success: true,
      backupCodes: twoFactorSettings.backup_codes || [],
      recoveryCodesUsed: twoFactorSettings.recovery_codes_used || 0
    });

  } catch (error) {
    logger.error('Unexpected error getting backup codes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    // Generate new backup codes
    const newBackupCodes = [];
    for (let i = 0; i < 10; i++) {
      newBackupCodes.push(Math.random().toString(36).substr(2, 8).toUpperCase());
    }

    // Update 2FA settings with new backup codes
    const { error: updateError } = await supabase
      .from('user_2fa_settings')
      .update({
        backup_codes: newBackupCodes,
        recovery_codes_used: 0, // Reset the counter
      })
      .eq('user_id', user.id);

    if (updateError) {
      logger.error('Error updating backup codes:', updateError);
      return NextResponse.json(
        { error: 'Failed to generate new backup codes' },
        { status: 500 }
      );
    }

    // Also update the profile table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        two_factor_backup_codes: newBackupCodes
      })
      .eq('id', user.id);

    if (profileError) {
      logger.error('Error updating profile backup codes:', profileError);
    }

    logger.info(`Generated new backup codes for user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: 'New backup codes generated successfully',
      backupCodes: newBackupCodes
    });

  } catch (error) {
    logger.error('Unexpected error generating backup codes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}