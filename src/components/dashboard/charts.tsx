'use client';

import React from 'react';

// Simple placeholder chart components for demonstration purposes
// In a real app, these would be implemented with a charting library like recharts or chart.js

export function BarChart({ data }: { data: any[] }) {
  // console.log('BarChart data:', data); // Placeholder for using data
  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg width="100%" height="100%" viewBox="0 0 300 200">
        <rect x="10" y="30" width="40" height="150" fill="#3b82f6" rx="4" />
        <rect x="60" y="70" width="40" height="110" fill="#3b82f6" rx="4" opacity="0.8" />
        <rect x="110" y="50" width="40" height="130" fill="#3b82f6" rx="4" />
        <rect x="160" y="90" width="40" height="90" fill="#3b82f6" rx="4" opacity="0.8" />
        <rect x="210" y="60" width="40" height="120" fill="#3b82f6" rx="4" />
        <text x="30" y="190" textAnchor="middle" fontSize="10" fill="#6b7280">Instagram</text>
        <text x="80" y="190" textAnchor="middle" fontSize="10" fill="#6b7280">Twitter</text>
        <text x="130" y="190" textAnchor="middle" fontSize="10" fill="#6b7280">Facebook</text>
        <text x="180" y="190" textAnchor="middle" fontSize="10" fill="#6b7280">LinkedIn</text>
        <text x="230" y="190" textAnchor="middle" fontSize="10" fill="#6b7280">TikTok</text>
      </svg>
    </div>
  );
}

export function BarChartComponent({ data, categoryKey, valueKey, valueFormatter, className }: { 
  data: any[]; 
  categoryKey?: string; 
  valueKey?: string; 
  valueFormatter?: (value: number) => string; 
  className?: string; 
}) {
  // Enhanced BarChart with additional props support
  return (
    <div className={`w-full h-full flex items-center justify-center ${className || ''}`}>
      <svg width="100%" height="100%" viewBox="0 0 300 200">
        <rect x="10" y="30" width="40" height="150" fill="#3b82f6" rx="4" />
        <rect x="60" y="70" width="40" height="110" fill="#3b82f6" rx="4" opacity="0.8" />
        <rect x="110" y="50" width="40" height="130" fill="#3b82f6" rx="4" />
        <rect x="160" y="90" width="40" height="90" fill="#3b82f6" rx="4" opacity="0.8" />
        <rect x="210" y="60" width="40" height="120" fill="#3b82f6" rx="4" />
        <text x="30" y="190" textAnchor="middle" fontSize="10" fill="#6b7280">Q1</text>
        <text x="80" y="190" textAnchor="middle" fontSize="10" fill="#6b7280">Q2</text>
        <text x="130" y="190" textAnchor="middle" fontSize="10" fill="#6b7280">Q3</text>
        <text x="180" y="190" textAnchor="middle" fontSize="10" fill="#6b7280">Q4</text>
        <text x="230" y="190" textAnchor="middle" fontSize="10" fill="#6b7280">Q5</text>
      </svg>
    </div>
  );
}

export function PieChart() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg width="200" height="200" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="80" fill="transparent" stroke="#e5e7eb" strokeWidth="40" />
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="transparent"
          stroke="#3b82f6"
          strokeWidth="40"
          strokeDasharray="251.2 502.4"
          strokeDashoffset="0"
        />
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="transparent"
          stroke="#8b5cf6"
          strokeWidth="40"
          strokeDasharray="125.6 502.4"
          strokeDashoffset="-251.2"
        />
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="transparent"
          stroke="#10b981"
          strokeWidth="40"
          strokeDasharray="75.4 502.4"
          strokeDashoffset="-376.8"
        />
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="transparent"
          stroke="#f59e0b"
          strokeWidth="40"
          strokeDasharray="50.2 502.4"
          strokeDashoffset="-452.2"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="grid grid-cols-2 gap-2 mt-[150px]">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
            <span className="text-xs">Video (50%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-purple-500 rounded-full mr-1"></div>
            <span className="text-xs">Image (25%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
            <span className="text-xs">Text (15%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
            <span className="text-xs">Other (10%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LineChart({ data }: { data: any[] }) {
  // console.log('LineChart data:', data); // Placeholder for using data
  return (
    <div className="w-full h-full flex items-end">
      <svg width="100%" height="100%" viewBox="0 0 300 80">
        <polyline
          points="0,70 50,60 100,50 150,30 200,20 250,10 300,15"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
        />
        <polyline
          points="0,70 50,60 100,50 150,30 200,20 250,10 300,15"
          fill="url(#gradient)"
          strokeWidth="0"
          opacity="0.2"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export const LineChartComponent = LineChart;

export function HotspotGeneration() {
  // Create a weekly heatmap showing best times to post
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = ['9am', '12pm', '3pm', '6pm', '9pm'];

  // Generate some random hotspots
  const hotspots = [
    { day: 'Mon', hour: '3pm', value: 0.8 },
    { day: 'Tue', hour: '12pm', value: 0.9 },
    { day: 'Wed', hour: '9am', value: 0.7 },
    { day: 'Thu', hour: '6pm', value: 0.95 },
    { day: 'Fri', hour: '3pm', value: 0.85 },
    { day: 'Sat', hour: '12pm', value: 0.75 },
    { day: 'Sun', hour: '9pm', value: 0.9 },
  ];

  const getIntensity = (day: string, hour: string) => {
    const hotspot = hotspots.find(h => h.day === day && h.hour === hour);
    // Use deterministic values based on day and hour to prevent hydration mismatch
    const dayIndex = days.indexOf(day);
    const hourIndex = hours.indexOf(hour);
    const baseIntensity = ((dayIndex + hourIndex * 2) % 10) / 20; // Creates values 0-0.5
    return hotspot ? hotspot.value : baseIntensity;
  };

  const getColor = (intensity: number) => {
    if (intensity > 0.8) return 'bg-red-500';
    if (intensity > 0.6) return 'bg-orange-400';
    if (intensity > 0.4) return 'bg-yellow-300';
    if (intensity > 0.2) return 'bg-green-200';
    return 'bg-blue-100';
  };

  return (
    <div className="w-full h-full p-4">
      <div className="grid grid-cols-8 gap-2">
        <div className="col-span-1"></div>
        {hours.map(hour => (
          <div key={hour} className="col-span-1 text-center text-xs text-gray-500">
            {hour}
          </div>
        ))}

        {days.map(day => (
          <React.Fragment key={day}>
            <div className="col-span-1 text-xs text-gray-500 flex items-center">
              {day}
            </div>
            {hours.map(hour => {
              const intensity = getIntensity(day, hour);
              return (
                <div key={`${day}-${hour}`} className="col-span-1 aspect-square relative">
                  <div
                    className={`absolute inset-0 rounded-md ${getColor(intensity)} flex items-center justify-center`}
                    style={{ opacity: intensity }}
                  >
                    {intensity > 0.7 && (
                      <span className="text-xs font-bold text-white">
                        {Math.round(intensity * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-center space-x-4">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-100 rounded-full mr-1"></div>
          <span className="text-xs">Low</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-200 rounded-full mr-1"></div>
          <span className="text-xs">Medium</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-yellow-300 rounded-full mr-1"></div>
          <span className="text-xs">Good</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-orange-400 rounded-full mr-1"></div>
          <span className="text-xs">Very Good</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
          <span className="text-xs">Optimal</span>
        </div>
      </div>
    </div>
  );
}