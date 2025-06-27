import { Platform } from "@/types/platform";

export interface ContentOptimizationOptions {
  maxLength?: number;
  hashtagCount?: number;
  includeEmojis?: boolean;
  imageAspectRatio?: string;
}

export class ContentOptimizer {
  private static platformDefaults: Record<Platform, ContentOptimizationOptions> = {
    'instagram': {
      maxLength: 2200,
      hashtagCount: 30,
      includeEmojis: true,
      imageAspectRatio: '1:1'
    },
    'twitter': {
      maxLength: 280,
      hashtagCount: 2,
      includeEmojis: true,
      imageAspectRatio: '16:9'
    },
    'tiktok': {
      maxLength: 150,
      hashtagCount: 5,
      includeEmojis: true,
      imageAspectRatio: '9:16'
    },
    'facebook': {
      maxLength: 63206,
      hashtagCount: 10,
      includeEmojis: true,
      imageAspectRatio: '1.91:1'
    },
    'linkedin': {
      maxLength: 1300,
      hashtagCount: 3,
      includeEmojis: false,
      imageAspectRatio: '1.91:1'
    },
    'youtube': {
      maxLength: 5000,
      hashtagCount: 10,
      includeEmojis: true,
      imageAspectRatio: '16:9'
    }
  };

  /**
   * Optimize content for a specific platform
   */
  static optimizeContent(
    content: string,
    platform: Platform,
    customOptions: Partial<ContentOptimizationOptions> = {}
  ): string {
    const options = { ...this.platformDefaults[platform], ...customOptions };
    let optimized = content;
    const maxLength = options.maxLength ?? 280;

    // Add hashtags if needed
    const hashtags = this.extractHashtags(optimized);
    if (hashtags.length < options.hashtagCount!) {
      const additionalHashtags = this.generateHashtags(optimized, options.hashtagCount! - hashtags.length);
      optimized += ' ' + additionalHashtags.join(' ');
    }

    // Add emojis if enabled
    if (options.includeEmojis && !this.hasEmojis(optimized)) {
      optimized = this.addEmojis(optimized);
    }

    // Truncate if needed (after all additions)
    if (optimized.length > maxLength) {
      optimized = optimized.substring(0, maxLength - 3) + '...';
    }

    return optimized;
  }

  /**
   * Generate platform-specific image dimensions
   */
  static getImageDimensions(aspectRatio: string, maxWidth: number = 1200): { width: number; height: number } {
    const [w, h] = aspectRatio.split(':').map(Number);
    const ratio = h / w;
    return {
      width: maxWidth,
      height: Math.round(maxWidth * ratio)
    };
  }

  private static extractHashtags(text: string): string[] {
    const hashtagRegex = /#\w+/g;
    return text.match(hashtagRegex) || [];
  }

  private static generateHashtags(text: string, count: number): string[] {
    // Simple implementation - in a real app, you might use AI or a hashtag database
    const words = text.toLowerCase().split(/\s+/);
    const commonWords = new Set(['the', 'and', 'for', 'with', 'this', 'that']);
    
    return words
      .filter(word => word.length > 3 && !commonWords.has(word))
      .slice(0, count)
      .map(word => `#${word.replace(/[^\w]/g, '')}`);
  }

  private static hasEmojis(text: string): boolean {
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    return emojiRegex.test(text);
  }

  private static addEmojis(text: string): string {
    // Simple emoji mapping - in a real app, you might use an NLP model
    const emojiMap: Record<string, string[]> = {
      'happy': ['😊', '😄', '😃'],
      'sad': ['😢', '😞', '😔'],
      'love': ['❤️', '💕', '😍'],
      'great': ['👍', '👏', '🎉'],
      'new': ['🆕', '✨', '🌟']
    };

    let result = text;
    Object.entries(emojiMap).forEach(([word, emojis]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      if (regex.test(text)) {
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        result = result.replace(regex, `${word} ${emoji}`);
      }
    });

    return result;
  }
}
