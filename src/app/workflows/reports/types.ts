export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'scatter';
  title: string;
  data: any[];
  xAxis: string;
  yAxis: string;
}

export interface ChartOptions {
  format?: 'svg' | 'png' | 'pdf';
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
}