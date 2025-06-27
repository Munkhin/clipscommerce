import { renderToStaticMarkup } from 'react-dom/server';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

/**
 * Data for chart rendering.
 */
export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'metric';
  title: string;
  data: any[];
  xAxis?: string;
  yAxis?: string | string[];
  options?: Record<string, any>;
}

/**
 * Generates charts and dashboards for reports.
 */
export class ChartGenerator {
  static async createChart(
    data: ChartData,
    format: 'svg' | 'json' = 'svg'
  ): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(data);
    }

    const { type, title, data: chartData, xAxis, yAxis } = data;

    let chartComponent;

    switch (type) {
      case 'line':
        chartComponent = (
          <LineChart width={500} height={300} data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxis} />
            <YAxis />
            <Tooltip />
            <Legend />
            {Array.isArray(yAxis) ? (
              yAxis.map((key, index) => (
                <Line key={index} type="monotone" dataKey={key} stroke={`#${Math.floor(Math.random()*16777215).toString(16)}`} />
              ))
            ) : (
              <Line type="monotone" dataKey={yAxis} stroke="#8884d8" />
            )}
          </LineChart>
        );
        break;
      case 'bar':
        chartComponent = (
          <BarChart width={500} height={300} data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxis} />
            <YAxis />
            <Tooltip />
            <Legend />
            {Array.isArray(yAxis) ? (
              yAxis.map((key, index) => (
                <Bar key={index} dataKey={key} fill={`#${Math.floor(Math.random()*16777215).toString(16)}`} />
              ))
            ) : (
              <Bar dataKey={yAxis} fill="#8884d8" />
            )}
          </BarChart>
        );
        break;
      case 'pie':
        chartComponent = (
          <PieChart width={500} height={300}>
            <Pie data={chartData} dataKey={yAxis as string} nameKey={xAxis} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label />
            <Tooltip />
            <Legend />
          </PieChart>
        );
        break;
      default:
        return `<svg><!-- Chart type not supported: ${type} --></svg>`;
    }

    return renderToStaticMarkup(chartComponent);
  }

  static async createDashboard(
    charts: Array<{ chart: ChartData; width?: number; height?: number }>,
    options?: { title?: string; layout?: 'grid' | 'vertical' | 'horizontal' }
  ): Promise<string> {
    // TODO: Implement dashboard rendering
    return `<div>Dashboard</div>`;
  }
} 