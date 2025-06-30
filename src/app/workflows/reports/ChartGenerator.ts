import { ChartData, ChartOptions } from './types';

export type { ChartData, ChartOptions } from './types';

export class ChartGenerator {
  generateChart(data: ChartData, options: ChartOptions | string): string | Promise<string> {
    // Placeholder for chart generation logic
    return 'Chart generated';
  }
} 