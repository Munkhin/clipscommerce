import { TikTokClient } from 'src/app/workflows/data_collection/lib/platforms/TikTokClient';
import { ApiConfig } from 'src/app/workflows/data_collection/lib/platforms/types';
import {
  IAuthTokenManager,
  PlatformClientIdentifier,
  PlatformCredentials,
  AuthStrategy,
  OAuth2Credentials as IOAuth2Credentials
} from 'src/app/workflows/data_collection/lib/auth.types';
import {
  TikTokUserInfo,
  TikTokUserInfoRequest
} from 'src/app/workflows/data_collection/lib/platforms/tiktok.types';
import readline from 'readline';

// Local type that matches the expected OAuth2Credentials interface
interface OAuth2Credentials extends IOAuth2Credentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
  strategy: AuthStrategy.OAUTH2;
}

// Platform enum that matches the AuthStrategy enum values
enum Platform {
  TIKTOK = 'tiktok',
  INSTAGRAM = 'instagram',
  YOUTUBE = 'youtube'
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Mock<T = any> {
      mockResolvedValue(value: any): Mock;
      mockImplementation(fn: Function): Mock;
    }
  }
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Simple mock AuthTokenManager for testing
class MockAuthTokenManager implements IAuthTokenManager {
  getToken: jest.Mock;
  refreshToken: jest.Mock;
  
  constructor() {
    this.getToken = jest.fn().mockResolvedValue('mock-access-token');
    this.refreshToken = jest.fn().mockResolvedValue({
      accessToken: 'new-mock-token',
      refreshToken: 'new-refresh-token',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      tokenType: 'bearer',
      strategy: AuthStrategy.OAUTH2
    });
  }
  
  async getValidCredentials(identifier: PlatformClientIdentifier): Promise<PlatformCredentials | null> {
    return {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      tokenType: 'bearer',
      strategy: AuthStrategy.OAUTH2
    } as OAuth2Credentials;
  }
  
  async storeCredentials(identifier: PlatformClientIdentifier, credentials: PlatformCredentials): Promise<void> {
    // Mock implementation
    console.log(`Storing credentials for ${identifier.platform}:`, credentials);
  }
  
  async clearCredentials(identifier: PlatformClientIdentifier): Promise<void> {
    // Mock implementation
    console.log(`Clearing credentials for ${identifier.platform}`);
  }
  
  // Add missing methods from IAuthTokenManager
  async getAuthUrl(platform: Platform): Promise<string> {
    return `https://${platform}.com/auth`;
  }
  
  async handleCallback(platform: Platform, code: string): Promise<PlatformCredentials> {
    return {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      tokenType: 'bearer',
      strategy: AuthStrategy.OAUTH2
    } as OAuth2Credentials;
  }
}

async function main() {
  console.log('🚀 TikTok Data Query Tool 🎵');
  console.log('--------------------------');
  
  // Initialize TikTok client with mock auth
  const authManager = new MockAuthTokenManager();
  
  const config: ApiConfig = {
    baseUrl: 'https://open.tiktokapis.com',
    platform: Platform.TIKTOK,
    version: 'v2',
    rateLimit: { requests: 10, perSeconds: 1 },
    credentials: {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      tokenType: 'bearer',
      strategy: AuthStrategy.OAUTH2
    }
  };
  
  // Create TikTok client with user ID as a string
  const userId = 'test-user-id';
  const tiktokClient = new TikTokClient(config, authManager, userId);
  
  // Main menu
  while (true) {
    console.log('\nWhat would you like to do?');
    console.log('1. Get user info');
    console.log('2. Get user videos');
    console.log('3. Search videos');
    console.log('4. Exit');
    
    const choice = await askQuestion('Enter your choice (1-4): ');
    
    try {
      switch (choice) {
        case '1':
          await getUserInfo(tiktokClient);
          break;
        case '2':
          await getUserVideos(tiktokClient);
          break;
        case '3':
          await searchVideos(tiktokClient);
          break;
        case '4':
          console.log('👋 Goodbye!');
          rl.close();
          return;
        default:
          console.log('❌ Invalid choice. Please try again.');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('❌ Error:', errorMessage);
    }
  }
}

async function getUserInfo(client: TikTokClient) {
  console.log('\n🔍 Fetching user info...');
  try {
    const params: TikTokUserInfoRequest = {
      fields: ['open_id', 'union_id', 'avatar_url', 'avatar_url_100', 'avatar_url_200', 'avatar_large_url',
        'display_name', 'bio_description', 'profile_deep_link', 'is_verified',
        'follower_count', 'following_count', 'likes_count', 'video_count']
    };
    const response = await client.getUserInfo(params);
    console.log('\n✅ User Info:');
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('❌ Error fetching user info:', error);
  }
}

async function getUserVideos(client: TikTokClient) {
  const limit = parseInt(await askQuestion('How many videos to fetch? (default: 10): ')) || 10;
  const cursor = await askQuestion('Cursor (press Enter for first page): ') || undefined;
  
  console.log('\n📹 Fetching user videos...');
  try {
    const result = await client.listUserVideos({
      fields: [
        'id', 'create_time', 'video_description', 'title', 
        'cover_image_url', 'share_url', 'duration', 'height', 
        'width', 'like_count', 'comment_count', 'share_count', 
        'view_count', 'play_url', 'download_url', 'format', 
        'is_ads', 'music', 'hashtags', 'mentions', 'location'
      ],
      max_count: Math.min(limit, 50), // TikTok API max is 50
      cursor: cursor || undefined
    });
    
    console.log('\n✅ Videos:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error fetching user videos:', error);
  }
}

async function searchVideos(client: TikTokClient) {
  const videoIds = (await askQuestion('Enter video IDs to query (comma-separated): '))
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);
  
  if (videoIds.length === 0) {
    console.log('❌ Please provide at least one video ID');
    return;
  }
  
  console.log(`\n🔍 Querying ${videoIds.length} video(s)...`);
  try {
    const result = await client.queryVideos({
      fields: [
        'id', 'create_time', 'video_description', 'title', 
        'cover_image_url', 'share_url', 'duration', 'height', 
        'width', 'like_count', 'comment_count', 'share_count', 
        'view_count', 'play_url', 'download_url', 'format', 
        'is_ads', 'music', 'hashtags', 'mentions', 'location'
      ],
      video_ids: videoIds
    });
    
    console.log('\n✅ Video Details:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error querying videos:', error);
  }
}

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Run the CLI
main().catch(console.error);
