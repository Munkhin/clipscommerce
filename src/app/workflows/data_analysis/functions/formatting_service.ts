// difficult
// Multi-Platform Formatting Service: FFmpeg, OpenCV, saliency, captions
export class FormattingService {
  /**
   * Convert video to target aspect ratio using FFmpeg and OpenCV saliency detection.
   * @param inputPath Path to input video
   * @param outputPath Path to output video
   * @param platform Target platform (tiktok, instagram, youtube)
   * @param ffmpeg FFmpeg client
   * @param opencv OpenCV client
   */
  async convertAspectRatio(
    inputPath: string,
    outputPath: string,
    platform: string,
    ffmpeg: any,
    opencv: any
  ): Promise<void> {
    try {
      // Platform ratios
      const ratios: any = {
        tiktok: '9:16',
        instagram: '4:5',
        youtube: '16:9'
      };
      const ratio = ratios[platform] || '9:16';
      // 1. Use OpenCV to detect saliency (faces/objects)
      const saliencyMap = await opencv.detectSaliency(inputPath);
      // 2. Compute crop region to avoid cutting faces/objects
      const cropRegion = await opencv.smartCrop(saliencyMap, ratio);
      // 3. Use FFmpeg to crop and resize
      await ffmpeg.cropAndResize(inputPath, outputPath, cropRegion, ratio);
    } catch (err) {
      console.error('FormattingService error:', err);
      throw new Error('Failed to convert aspect ratio');
    }
  }

  /**
   * Adapt caption for a target platform (length, emoji, hashtag rules)
   */
  adaptCaption(platform: string, caption: string): string {
    if (platform === 'tiktok') {
      // ≤150 chars, 3 emojis
      let text = caption.slice(0, 150);
      const emojis = (text.match(/[\u{1F600}-\u{1F6FF}]/gu) || []).slice(0, 3);
      text = text.replace(/[\u{1F600}-\u{1F6FF}]/gu, '');
      return text + emojis.join('');
    }
    if (platform === 'instagram') {
      // ≤300 chars, 10 hashtags
      let text = caption.slice(0, 300);
      const hashtags = (text.match(/#[\w]+/g) || []).slice(0, 10);
      text = text.replace(/#[\w]+/g, '');
      return text + ' ' + hashtags.join(' ');
    }
    if (platform === 'youtube') {
      // ≤100 chars, first line optimized for CTR
      return caption.split('\n')[0].slice(0, 100);
    }
    return caption;
  }
}
