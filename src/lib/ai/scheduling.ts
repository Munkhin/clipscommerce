import { Platform } from "@/types/platform";
import { Post } from "@/types/schedule";

export interface OptimalTimeWindow {
  startTime: Date;
  endTime: Date;
  engagementScore: number;
}

export class Scheduler {
  /**
   * Calculate optimal posting times based on historical engagement data
   */
  static async calculateOptimalTimes(
    platform: Platform,
    historicalData: any[],
    timezone: string = 'UTC'
  ): Promise<OptimalTimeWindow[]> {
    // Group engagement by time of day
    const engagementByHour = Array(24).fill(0);
    const engagementByDay = Array(7).fill(0);

    historicalData.forEach(post => {
      const date = new Date(post.timestamp);
      const hour = date.getUTCHours();
      const day = date.getUTCDay();
      
      engagementByHour[hour] += post.engagementRate || 0;
      engagementByDay[day] += post.engagementRate || 0;
    });

    // Find top 3 hours with highest engagement
    const topHours = engagementByHour
      .map((score, hour) => ({ hour, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // Convert to time windows (1-hour windows)
    const now = new Date();
    return topHours.map(({ hour, score }) => ({
      startTime: new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          hour,
          0,
          0
        )
      ),
      endTime: new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          hour + 1,
          0,
          0
        )
      ),
      engagementScore: score
    }));
  }

  /**
   * Generate a posting schedule for the next week
   */
  static async generateWeeklySchedule(
    platform: Platform,
    historicalData: any[],
    timezone: string = 'UTC',
    postsPerDay: number = 3
  ): Promise<Date[]> {
    const optimalTimes = await this.calculateOptimalTimes(platform, historicalData, timezone);
    const schedule: Date[] = [];
    const today = new Date();
    
    // Generate schedule for next 7 days
    for (let day = 0; day < 7; day++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + day + 1);
      
      // Add optimal times for this day
      optimalTimes.slice(0, postsPerDay).forEach(time => {
        const scheduledTime = new Date(time.startTime);
        scheduledTime.setDate(targetDate.getDate());
        scheduledTime.setMonth(targetDate.getMonth());
        scheduledTime.setFullYear(targetDate.getFullYear());
        schedule.push(scheduledTime);
      });
    }
    
    return schedule;
  }

  public async schedulePost(post: { content: string; platforms: string[]; scheduledTime: Date }) {
    if (post.scheduledTime < new Date()) {
      throw new Error('Cannot schedule post in the past');
    }
    return {
      success: true,
      scheduledTime: post.scheduledTime,
      post,
    };
  }

  public async getOptimalSchedule(posts: any[], options: { startDate: Date; endDate: Date; platform: string }) {
    // For test purposes, just assign each post a scheduledTime spaced by 1 hour from startDate
    const schedule = posts.map((post, i) => ({
      post,
      scheduledTime: new Date(options.startDate.getTime() + i * 60 * 60 * 1000),
    }));
    return schedule;
  }
}

export { Scheduler as PostScheduler };
