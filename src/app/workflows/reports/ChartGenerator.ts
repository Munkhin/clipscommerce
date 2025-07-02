import { ChartData, ChartOptions } from './types/index';

export class ChartGenerator {
  generateChart(data: ChartData, options: ChartOptions): string {
    // Placeholder for chart generation logic
    return 'Chart generated';
  }

  async generateChart(data: any, format: string): Promise<string> {
    // Async chart generation method for compatibility
    return `Chart generated in ${format} format`;
  }
}

// Re-export ChartData for external use
export { ChartData } from './types/index'; 