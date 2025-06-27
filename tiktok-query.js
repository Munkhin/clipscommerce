"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const TikTokClient_1 = require("./src/app/data_collection/lib/platforms/TikTokClient");
const auth_types_1 = require("./src/app/data_collection/lib/auth.types");
const readline_1 = __importDefault(require("readline"));
// Platform enum that matches the AuthStrategy enum values
var Platform;
(function (Platform) {
    Platform["TIKTOK"] = "tiktok";
    Platform["INSTAGRAM"] = "instagram";
    Platform["YOUTUBE"] = "youtube";
})(Platform || (Platform = {}));
// Create readline interface
const rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout
});
// Simple mock AuthTokenManager for testing
class MockAuthTokenManager {
    constructor() {
        this.getToken = jest.fn().mockResolvedValue('mock-access-token');
        this.refreshToken = jest.fn().mockResolvedValue({
            accessToken: 'new-mock-token',
            refreshToken: 'new-refresh-token',
            expiresAt: Math.floor(Date.now() / 1000) + 3600,
            tokenType: 'bearer',
            strategy: auth_types_1.AuthStrategy.OAUTH2
        });
    }
    async getValidCredentials(identifier) {
        return {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresAt: Math.floor(Date.now() / 1000) + 3600,
            tokenType: 'bearer',
            strategy: auth_types_1.AuthStrategy.OAUTH2
        };
    }
    async storeCredentials(identifier, credentials) {
        // Mock implementation
        console.log(`Storing credentials for ${identifier.platform}:`, credentials);
    }
    async clearCredentials(identifier) {
        // Mock implementation
        console.log(`Clearing credentials for ${identifier.platform}`);
    }
    // Add missing methods from IAuthTokenManager
    async getAuthUrl(platform) {
        return `https://${platform}.com/auth`;
    }
    async handleCallback(platform, code) {
        return {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresAt: Math.floor(Date.now() / 1000) + 3600,
            tokenType: 'bearer',
            strategy: auth_types_1.AuthStrategy.OAUTH2
        };
    }
}
async function main() {
    console.log('🚀 TikTok Data Query Tool 🎵');
    console.log('--------------------------');
    // Initialize TikTok client with mock auth
    const authManager = new MockAuthTokenManager();
    const config = {
        baseUrl: 'https://open.tiktokapis.com',
        platform: Platform.TIKTOK,
        version: 'v2',
        rateLimit: { requests: 10, perSeconds: 1 },
        credentials: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresAt: Math.floor(Date.now() / 1000) + 3600,
            tokenType: 'bearer',
            strategy: auth_types_1.AuthStrategy.OAUTH2
        }
    };
    // Create TikTok client with user ID as a string
    const userId = 'test-user-id';
    const tiktokClient = new TikTokClient_1.TikTokClient(config, authManager, userId);
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            console.error('❌ Error:', errorMessage);
        }
    }
}
async function getUserInfo(client) {
    console.log('\n🔍 Fetching user info...');
    try {
        const params = {
            fields: ['open_id', 'union_id', 'avatar_url', 'avatar_url_100', 'avatar_url_200', 'avatar_large_url',
                'display_name', 'bio_description', 'profile_deep_link', 'is_verified',
                'follower_count', 'following_count', 'likes_count', 'video_count']
        };
        const response = await client.getUserInfo(params);
        console.log('\n✅ User Info:');
        console.log(JSON.stringify(response, null, 2));
    }
    catch (error) {
        console.error('❌ Error fetching user info:', error);
    }
}
async function getUserVideos(client) {
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
    }
    catch (error) {
        console.error('❌ Error fetching user videos:', error);
    }
}
async function searchVideos(client) {
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
    }
    catch (error) {
        console.error('❌ Error querying videos:', error);
    }
}
function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}
// Run the CLI
main().catch(console.error);
