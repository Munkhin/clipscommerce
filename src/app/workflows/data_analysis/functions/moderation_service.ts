// Content Moderation Service: Google Perspective API
export class ModerationService {
  /**
   * Moderate a hook using Google Perspective API. Reject if toxicity > 0.3.
   */
  async moderateHook(hook: string, perspectiveClient: any): Promise<boolean> {
    try {
      const score = await perspectiveClient.getToxicityScore(hook);
      return score <= 0.3;
    } catch (err) {
      console.error('ModerationService error:', err);
      return false;
    }
  }
}
