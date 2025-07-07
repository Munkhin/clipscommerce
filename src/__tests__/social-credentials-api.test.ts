// src/__tests__/social-credentials-api.test.ts
import { GET } from '@/app/api/social-credentials/usernames/route';
import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

jest.mock('@/lib/supabase/server');
jest.mock('next/headers');

describe('/api/social-credentials/usernames', () => {
  it('should return a list of connected social platforms', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [
          {
            platform: 'tiktok',
            platform_user_id: '12345',
            access_token: 'tiktok-token',
            refresh_token: 'tiktok-refresh',
            expires_at: '2025-12-31T23:59:59Z',
            updated_at: '2025-07-07T12:00:00Z',
          },
        ],
        error: null,
      }),
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    (cookies as jest.Mock).mockReturnValue(new Map());

    const request = new NextRequest('http://localhost/api/social-credentials/usernames');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([
      {
        platform: 'tiktok',
        username: 'TikTok User',
        displayName: 'TikTok User',
        profileImage: undefined,
        isConnected: true,
        connectedAt: '2025-07-07T12:00:00Z',
      },
    ]);
  });
});
