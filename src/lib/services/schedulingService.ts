import { Platform } from "@/types/platform";
import { Post, ScheduleRule } from "@/types/schedule";
import { Scheduler, OptimalTimeWindow } from "@/lib/ai/scheduling";
import { EngagementPredictor, EngagementMetrics } from "@/lib/ai/engagementPredictor";
import { ContentOptimizer } from "@/lib/ai/contentOptimizer";

interface SchedulingServiceDependencies {
  getPosts: (filter: any) => Promise<Post[]>;
  getPostMetrics: (postId: string, platform: Platform) => Promise<EngagementMetrics>;
  getUserTimezone: () => Promise<string>;
}

export class SchedulingService {
  private static instance: SchedulingService;
  private dependencies: SchedulingServiceDependencies;

  private constructor(dependencies: SchedulingServiceDependencies) {
    this.dependencies = dependencies;
  }

  public static getInstance(dependencies: SchedulingServiceDependencies): SchedulingService {
    if (!SchedulingService.instance) {
      SchedulingService.instance = new SchedulingService(dependencies);
    }
    return SchedulingService.instance;
  }

  /**
   * Get optimal posting times for a platform
   */
  public async getOptimalTimes(
    platform: Platform,
    timezone?: string
  ): Promise<OptimalTimeWindow[]> {
    const tz = timezone || await this.dependencies.getUserTimezone();
    
    // Get historical posts for this platform
    const posts = await this.dependencies.getPosts({
      platforms: [platform],
      status: 'published',
      limit: 100, // Get up to 100 most recent posts
    });
    
    // Get engagement metrics for each post
    const postsWithMetrics = await Promise.all(
      posts.map(async post => ({
        ...post,
        metrics: await this.dependencies.getPostMetrics(post.id, platform)
      }))
    );
    
    // Use the Scheduler to calculate optimal times
    return Scheduler.calculateOptimalTimes(platform, postsWithMetrics, tz);
  }

  /**
   * Generate a posting schedule based on rules and preferences
   */
  public async generateSchedule(
    rules: ScheduleRule[],
    timezone?: string
  ): Promise<Array<{ date: Date; platform: Platform; ruleId: string }>> {
    const tz = timezone || await this.dependencies.getUserTimezone();
    const schedule: Array<{ date: Date; platform: Platform; ruleId: string }> = [];
    
    for (const rule of rules) {
      if (!rule.isActive) continue;
      
      const { schedule: scheduleConfig, platforms } = rule;
      const { type, times, days, timezone: ruleTz = tz } = scheduleConfig;
      
      // Handle different schedule types
      switch (type) {
        case 'optimal':
          // For each platform in the rule, get optimal times
          for (const platform of platforms) {
            const optimalTimes = await this.getOptimalTimes(platform, ruleTz);
            
            // Add each optimal time to the schedule
            optimalTimes.forEach(timeWindow => {
              schedule.push({
                date: timeWindow.startTime,
                platform,
                ruleId: rule.id,
              });
            });
          }
          break;
          
        case 'specific':
          // For specific times on specific days
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + 30); // Plan for next 30 days
          
          const currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
            
            if (!days || days.includes(dayOfWeek)) {
              // Add each time slot for this day
              for (const timeStr of times || []) {
                const [hours, minutes] = timeStr.split(':').map(Number);
                const slotDate = new Date(currentDate);
                slotDate.setHours(hours, minutes, 0, 0);
                
                // Add for each platform
                for (const platform of platforms) {
                  schedule.push({
                    date: new Date(slotDate),
                    platform,
                    ruleId: rule.id,
                  });
                }
              }
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
          }
          break;
          
        case 'interval':
          // For regular intervals (e.g., every 3 hours)
          const intervalHours = parseInt(times?.[0] || '3', 10);
          const startTime = new Date();
          startTime.setHours(9, 0, 0, 0); // Start at 9 AM
          
          let currentTime = new Date(startTime);
          const endTime = new Date(startTime);
          endTime.setHours(21, 0, 0, 0); // End at 9 PM
          
          while (currentTime <= endTime) {
            for (const platform of platforms) {
              schedule.push({
                date: new Date(currentTime),
                platform,
                ruleId: rule.id,
              });
            }
            
            currentTime = new Date(currentTime.getTime() + intervalHours * 60 * 60 * 1000);
          }
          break;
          
        case 'recurring':
          // For recurring schedules (e.g., every Monday at 9 AM)
          // Similar to 'specific' but with recurring logic
          // Implementation would be similar to 'specific' but with date handling
          // for recurring events (weekly, monthly, etc.)
          break;
      }
    }
    
    // Sort schedule by date
    schedule.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    return schedule;
  }

  /**
   * Get the best time to post based on historical performance
   */
  public async getBestTimeToPost(
    platform: Platform,
    content: string,
    timezone?: string
  ): Promise<{ bestTime: Date; expectedEngagement: number }> {
    const tz = timezone || await this.dependencies.getUserTimezone();
    
    // Get optimal times
    const optimalTimes = await this.getOptimalTimes(platform, tz);
    if (optimalTimes.length === 0) {
      // If no optimal times, default to now + 1 hour
      const defaultTime = new Date();
      defaultTime.setHours(defaultTime.getHours() + 1);
      return { bestTime: defaultTime, expectedEngagement: 0 };
    }
    
    // Get historical engagement data
    const posts = await this.dependencies.getPosts({
      platforms: [platform],
      status: 'published',
      limit: 50,
    });
    
    // Predict engagement for each optimal time
    const predictions = await Promise.all(
      optimalTimes.map(async timeWindow => ({
        timeWindow,
        engagement: await EngagementPredictor.predictEngagement(
          platform,
          content,
          posts
        ),
      }))
    );
    
    // Find the time with highest predicted engagement
    const bestPrediction = predictions.reduce((best, current) => {
      const currentEngagement = current.engagement.engagementRate;
      const bestEngagement = best.engagement.engagementRate;
      return currentEngagement > bestEngagement ? current : best;
    }, predictions[0]);
    
    return {
      bestTime: bestPrediction.timeWindow.startTime,
      expectedEngagement: bestPrediction.engagement.engagementRate,
    };
  }

  /**
   * Optimize post content for a specific platform
   */
  public optimizeContent(
    content: string,
    platform: Platform,
    options?: {
      maxLength?: number;
      hashtagCount?: number;
      includeEmojis?: boolean;
    }
  ): string {
    return ContentOptimizer.optimizeContent(content, platform, options);
  }

  /**
   * Generate content variations for A/B testing
   */
  public generateContentVariations(
    content: string,
    platform: Platform,
    variations: number = 3
  ): string[] {
    const results: string[] = [];
    
    for (let i = 0; i < variations; i++) {
      // In a real app, you would use more sophisticated logic here
      // This is a simplified example
      let variation = content;
      
      // Add emojis to some variations
      if (i % 2 === 0) {
        variation = ContentOptimizer.optimizeContent(variation, platform, {
          includeEmojis: true,
        });
      }
      
      // Add hashtags to some variations
      if (i % 3 === 0) {
        variation = ContentOptimizer.optimizeContent(variation, platform, {
          hashtagCount: 3,
        });
      }
      
      // Add a call to action to some variations
      if (i % 2 === 1) {
        const ctas = [
          'What do you think? Comment below!',
          'Double tap if you agree!',
          'Save this for later!',
          'Tag someone who needs to see this!',
        ];
        variation += `\n\n${ctas[i % ctas.length]}`;
      }
      
      results.push(variation);
    }
    
    return results;
  }

  /**
   * Get content performance predictions for different times
   */
  public async getPerformancePredictions(
    content: string,
    platform: Platform,
    timeSlots: Date[],
    timezone?: string
  ): Promise<Array<{ time: Date; metrics: EngagementMetrics }>> {
    const tz = timezone || await this.dependencies.getUserTimezone();
    
    // Get historical posts for context
    const posts = await this.dependencies.getPosts({
      platforms: [platform],
      status: 'published',
      limit: 50,
    });
    
    // Predict engagement for each time slot
    return Promise.all(
      timeSlots.map(async time => ({
        time,
        metrics: await EngagementPredictor.predictEngagement(
          platform,
          content,
          posts,
          tz
        ),
      }))
    );
  }
}
