// ScheduleOptimizer.ts

export interface ScheduleInput {
  platform: 'tiktok' | 'instagram' | 'youtube';
  audienceData: {
    timezone: string;
    activityHours: number[]; // Hour of day (0-23)
    peakDays: number[]; // Day of week (0-6)
  };
  contentType: 'video' | 'image' | 'story' | 'reel';
  historicalPerformance?: {
    bestTimes: Array<{ hour: number; engagementRate: number }>;
  };
}

export interface ScheduleSlot {
  timestamp: Date;
  platform: string;
  contentType: string;
  expectedEngagement: number;
}

export function generateOptimalSchedule(input: ScheduleInput): ScheduleSlot[] {
  const { platform, audienceData, contentType, historicalPerformance } = input;
  const slots: ScheduleSlot[] = [];
  const { activityHours, peakDays, timezone } = audienceData;
  const now = new Date();
  // Use historical best times if available, else use all combinations
  let bestTimes: Array<{ hour: number; engagementRate: number }> = [];
  if (historicalPerformance && historicalPerformance.bestTimes.length > 0) {
    bestTimes = historicalPerformance.bestTimes;
  } else {
    bestTimes = activityHours.map(hour => ({ hour, engagementRate: 0.5 }));
  }
  // For each peak day and best time, create a slot in the next week
  for (const day of peakDays) {
    for (const { hour, engagementRate } of bestTimes) {
      // Find the next date for this day of week
      const date = new Date(now);
      const dayDiff = (day + 7 - date.getDay()) % 7;
      date.setDate(date.getDate() + dayDiff);
      date.setHours(hour, 0, 0, 0);
      // Optionally adjust for timezone (skipped for simplicity)
      slots.push({
        timestamp: new Date(date),
        platform,
        contentType,
        expectedEngagement: engagementRate,
      });
    }
  }
  // Sort by expected engagement descending
  return slots.sort((a, b) => b.expectedEngagement - a.expectedEngagement);
} 