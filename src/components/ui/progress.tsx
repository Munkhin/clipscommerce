import * as React from "react";
import { cn } from "../../lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** value from 0–100 */
  value?: number;
  /** height in tailwind class e.g. h-2 (defaults to h-2) */
  barHeightClass?: string;
  /** optional background color class */
  trackClassName?: string;
  /** optional fill color class */
  fillClassName?: string;
}

/**
 * Linear progress bar that follows ClipsCommerce design system.
 * Usage: <Progress value={40} />
 */
export function Progress({
  value = 0,
  className,
  barHeightClass = "h-2",
  trackClassName = "bg-muted",
  fillClassName = "bg-primary",
  ...props
}: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("w-full overflow-hidden rounded-full", barHeightClass, trackClassName, className)}
      {...props}
    >
      <div
        style={{ width: `${clamped}%` }}
        className={cn("h-full transition-all duration-500 ease-in-out", fillClassName)}
      />
    </div>
  );
}
