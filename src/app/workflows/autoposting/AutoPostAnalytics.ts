interface PostOutcome {
  postId: string;
  platform: string;
  engagement: number;
  reach: number;
  roi?: number;
  timestamp: Date;
}

export class AutoPostAnalytics {
  private outcomes: PostOutcome[] = [];

  recordOutcome(outcome: PostOutcome) {
    this.outcomes.push(outcome);
  }

  generateReport(periodDays = 7) {
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const filtered = this.outcomes.filter(o => o.timestamp >= since);
    const totalEngagement = filtered.reduce((a, b) => a + b.engagement, 0);
    const totalReach = filtered.reduce((a, b) => a + b.reach, 0);
    const avgROI = filtered.length ? filtered.reduce((a, b) => a + (b.roi || 0), 0) / filtered.length : 0;
    return {
      totalPosts: filtered.length,
      totalEngagement,
      totalReach,
      avgROI,
    };
  }

  getAllOutcomes() {
    return this.outcomes;
  }
} 