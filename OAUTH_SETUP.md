# OAuth Setup Guide for ClipsCommerce

This guide will help you set up OAuth credentials for social media platform integrations.

## Overview

ClipsCommerce supports connecting to:
- **TikTok** - For content analysis and posting
- **Instagram** - For content analysis and posting 
- **YouTube** - For content analysis and channel management

## Prerequisites

1. Developer accounts on each platform
2. A publicly accessible domain (for production) or ngrok for local development
3. Environment variables configured in `.env.local`

## Platform Setup Instructions

### 1. TikTok for Developers

**Step 1: Create a TikTok Developer Account**
1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Sign up with your TikTok account
3. Complete the developer verification process

**Step 2: Create an App**
1. Go to "Manage Apps" in the developer portal
2. Click "Create an App"
3. Fill in app details:
   - App name: ClipsCommerce
   - App category: Social Media Management
   - Platform: Web

**Step 3: Configure OAuth**
1. In your app settings, go to "Login Kit"
2. Add redirect URLs:
   - Development: `http://localhost:3000/api/oauth/tiktok/callback`
   - Production: `https://yourdomain.com/api/oauth/tiktok/callback`
3. Add required scopes:
   - `user.info.basic` - Basic user information
   - `video.list` - Access to user's videos

**Step 4: Get Credentials**
1. Copy the Client Key (use as `NEXT_PUBLIC_TIKTOK_CLIENT_ID`)
2. Copy the Client Secret (use as `TIKTOK_CLIENT_SECRET`)

### 2. Instagram Basic Display API

**Step 1: Create a Facebook App**
1. Go to [Facebook for Developers](https://developers.facebook.com/)
2. Create a new app
3. Select "Consumer" as app type

**Step 2: Add Instagram Basic Display**
1. In your app, click "Add Product"
2. Find "Instagram Basic Display" and click "Set Up"
3. Create a new Instagram App ID

**Step 3: Configure OAuth**
1. In Instagram Basic Display settings:
2. Add redirect URLs:
   - Development: `http://localhost:3000/api/oauth/instagram/callback`
   - Production: `https://yourdomain.com/api/oauth/instagram/callback`
3. Add test users (for development)

**Step 4: Get Credentials**
1. Copy the Instagram App ID (use as `NEXT_PUBLIC_INSTAGRAM_CLIENT_ID`)
2. Copy the Instagram App Secret (use as `INSTAGRAM_CLIENT_SECRET`)

### 3. YouTube Data API v3

**Step 1: Create a Google Cloud Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the YouTube Data API v3

**Step 2: Create OAuth Credentials**
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Select "Web application"
4. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/oauth/youtube/callback`
   - Production: `https://yourdomain.com/api/oauth/youtube/callback`

**Step 3: Configure OAuth Consent Screen**
1. Go to "OAuth consent screen"
2. Fill in app information
3. Add scopes:
   - `https://www.googleapis.com/auth/youtube.readonly`
4. Add test users (for development)

**Step 4: Get Credentials**
1. Copy the Client ID (use as `NEXT_PUBLIC_YOUTUBE_CLIENT_ID`)
2. Copy the Client Secret (use as `YOUTUBE_CLIENT_SECRET`)

## Environment Variables Setup

Add these to your `.env.local` file:

```env
# TikTok
NEXT_PUBLIC_TIKTOK_CLIENT_ID=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret

# Instagram
NEXT_PUBLIC_INSTAGRAM_CLIENT_ID=your_instagram_app_id
INSTAGRAM_CLIENT_SECRET=your_instagram_app_secret

# YouTube
NEXT_PUBLIC_YOUTUBE_CLIENT_ID=your_google_client_id
YOUTUBE_CLIENT_SECRET=your_google_client_secret

# Feature Flags (enable platforms)
FEATURE_INSTAGRAM_AUTH=true
FEATURE_YOUTUBE_AUTH=true
```

## Testing the Integration

1. Start your development server: `npm run dev`
2. Navigate to `/dashboard/connect`
3. Click "Connect Account" to open the modal
4. Try connecting each platform
5. Check that credentials are saved in your database

## Troubleshooting

### Common Issues

**"Client ID not configured" error**
- Ensure environment variables are properly set
- Restart your development server after adding env vars

**"State validation failed" error**
- Check that cookies are enabled
- Ensure your domain matches the configured redirect URI

**"Token exchange failed" error**
- Verify your client secret is correct
- Check that redirect URI exactly matches the configured one

**Instagram "Invalid redirect_uri" error**
- Instagram redirect URIs are case-sensitive
- Ensure no trailing slashes in redirect URI

**YouTube "redirect_uri_mismatch" error**
- Google redirect URIs must exactly match
- Check for http vs https mismatch

### Development with ngrok

For local development with real OAuth callbacks:

1. Install ngrok: `npm install -g ngrok`
2. Start your dev server: `npm run dev`
3. In another terminal: `ngrok http 3000`
4. Use the https ngrok URL in your OAuth app configurations
5. Update your `.env.local` with the ngrok URL

Example:
```env
NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
TIKTOK_REDIRECT_URI=https://abc123.ngrok.io/api/oauth/tiktok/callback
```

## Security Notes

- Never commit OAuth secrets to version control
- Use different OAuth apps for development and production
- Regularly rotate your OAuth secrets
- Monitor your OAuth app usage for suspicious activity
- Follow platform-specific security guidelines

## Support

If you encounter issues:
1. Check the browser console for errors
2. Review the server logs
3. Verify your OAuth app configuration
4. Test with a fresh incognito browser window
5. Refer to platform-specific OAuth documentation