export class UIAgent {
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async executeTask(task: any): Promise<void> {}
  async getStatus(): Promise<'active' | 'idle' | 'error'> { return 'idle'; }
  async getPerformance(): Promise<number> { return 0.8; }
  async getResourceUtilization(): Promise<number> { return 0.1; }
  async getCurrentTask(): Promise<string | undefined> { return undefined; }
} 