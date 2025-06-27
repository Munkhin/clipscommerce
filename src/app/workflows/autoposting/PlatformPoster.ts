export interface PlatformPoster {
  platform: string;
  validateContent(content: any): Promise<boolean>;
  schedulePost(content: any, scheduleTime: Date): Promise<string>;
  getPostStatus(postId: string): Promise<{
    status: 'scheduled' | 'published' | 'failed';
    url?: string;
    error?: string;
  }>;
}

export class TikTokPoster implements PlatformPoster {
  platform = 'tiktok';
  async validateContent(content: any): Promise<boolean> {
    // Basic validation: require a mediaUrl or videoUrl field for TikTok
    if (!content || (!content.mediaUrl && !content.videoUrl)) {
      throw new Error('TikTok content must include a mediaUrl or videoUrl field');
    }
    return true;
  }
  async schedulePost(content: any, scheduleTime: Date): Promise<string> {
    // For demo purposes, simulate scheduling by returning a mock ID.
    // In production, integrate with TikTok Publish API.
    const mockId = `tiktok_${Date.now()}`;
    setTimeout(() => {
      // Simulate publish event after scheduledTime
    }, Math.max(0, scheduleTime.getTime() - Date.now()));
    return mockId;
  }
  async getPostStatus(postId: string) {
    // Mock always published after 5 minutes
    const created = parseInt(postId.split('_')[1] || '0', 10);
    const ageMs = Date.now() - created;
    if (ageMs > 5 * 60 * 1000) {
      return { status: 'published' as const, url: `https://www.tiktok.com/@mock/video/${postId}` };
    }
    return { status: 'scheduled' as const };
  }
}

export class InstagramPoster implements PlatformPoster {
  platform = 'instagram';
  async validateContent(content: any): Promise<boolean> {
    if (!content || (!content.mediaUrl && !content.imageUrl)) {
      throw new Error('Instagram content must include a mediaUrl or imageUrl field');
    }
    return true;
  }
  async schedulePost(content: any, scheduleTime: Date): Promise<string> {
    const mockId = `instagram_${Date.now()}`;
    setTimeout(() => {}, Math.max(0, scheduleTime.getTime() - Date.now()));
    return mockId;
  }
  async getPostStatus(postId: string) {
    const created = parseInt(postId.split('_')[1] || '0', 10);
    const ageMs = Date.now() - created;
    if (ageMs > 5 * 60 * 1000) {
      return { status: 'published' as const, url: `https://www.instagram.com/p/${postId}` };
    }
    return { status: 'scheduled' as const };
  }
}

export class YouTubePoster implements PlatformPoster {
  platform = 'youtube';
  async validateContent(content: any): Promise<boolean> {
    if (!content || !content.videoPath) {
      throw new Error('YouTube content must include a videoPath');
    }
    return true;
  }
  async schedulePost(content: any, scheduleTime: Date): Promise<string> {
    const mockId = `youtube_${Date.now()}`;
    setTimeout(() => {}, Math.max(0, scheduleTime.getTime() - Date.now()));
    return mockId;
  }
  async getPostStatus(postId: string) {
    const created = parseInt(postId.split('_')[1] || '0', 10);
    const ageMs = Date.now() - created;
    if (ageMs > 5 * 60 * 1000) {
      return { status: 'published' as const, url: `https://www.youtube.com/watch?v=${postId}` };
    }
    return { status: 'scheduled' as const };
  }
} 