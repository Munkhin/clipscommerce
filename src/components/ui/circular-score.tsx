import React from "react";
import { cn } from "../../lib/utils";

interface CircularScoreProps {
  /** Between 0 and 100 */
  value: number;
  size?: number; // px
  strokeWidth?: number; // px
  /** Tailwind color class for stroke */
  colorClass?: string;
  className?: string;
}

export function CircularScore({
  value,
  size = 96,
  strokeWidth = 8,
  colorClass = "stroke-primary",
  className,
}: CircularScoreProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      className={cn("" , className)}
      role="img"
      aria-label={`Score: ${clamped}%`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        className="stroke-muted fill-none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        className={cn("fill-none transition-all duration-700 ease-out", colorClass)}
        style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
        strokeLinecap="round"
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        className="text-sm font-semibold text-foreground"
      >
        {clamped}%
      </text>
    </svg>
  );
} 