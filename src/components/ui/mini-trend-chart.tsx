'use client';

import React from 'react';
import { Line, ResponsiveContainer, Tooltip } from 'recharts';
import { LazyRechartsComponents } from '@/components/optimized/LazyComponents';

interface MiniTrendChartProps {
  data: Array<{ name: string; value: number }>;
  color?: string;
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/80 backdrop-blur-sm p-2 rounded-md border border-border text-xs shadow-lg">
        <p className="font-medium">{`${label} : ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

export function MiniTrendChart({ data, color = '#8884d8', height = 60 }: MiniTrendChartProps) {
  if (!data || data.length === 0) {
    return <div style={{ height: `${height}px` }} className="flex items-center justify-center text-xs text-muted-foreground">No trend data</div>;
  }

  const { LineChart: RechartsLineChart } = LazyRechartsComponents;

  return (
    <div style={{ width: '100%', height: `${height}px` }} className="mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--foreground))', strokeDasharray: '3 3' }} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
} 