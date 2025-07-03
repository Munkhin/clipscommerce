// Define types locally to avoid import issues
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  type?: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'scatter';
}

export interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: {
    title?: {
      display: boolean;
      text: string;
    };
    legend?: {
      display: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
  };
  scales?: {
    x?: {
      display: boolean;
      title?: {
        display: boolean;
        text: string;
      };
    };
    y?: {
      display: boolean;
      title?: {
        display: boolean;
        text: string;
      };
    };
  };
}

export class ChartGenerator {
  generateChart(data: ChartData, options: ChartOptions): string {
    // Placeholder for chart generation logic
    return 'Chart generated';
  }

  async generateChartAsync(data: any, format: string): Promise<string> {
    // Async chart generation method for compatibility
    return `Chart generated in ${format} format`;
  }
} 